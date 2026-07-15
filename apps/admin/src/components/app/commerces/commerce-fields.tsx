"use client";

import { Controller, type Control } from "react-hook-form";
import type { FunctionReturnType } from "convex/server";
import { api } from "@packages/backend/convex/_generated/api";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  HorarioEditor,
  type Horario,
} from "@/components/app/entrepreneur/horario-editor";

/**
 * The shared fiche fields — the single source of the Commerce form markup used
 * identically by the entrepreneur submission (`FicheWizard`), the entrepreneur
 * edit (`MiNegocioView`), the admin edit (`CommerceEditForm`) and the admin
 * seeded-account creation (`CreateEntrepriseForm`). Extracting them keeps the
 * fields and their labels in one place, so the surfaces can never drift.
 *
 * The fields come in three groups matching the sectioned card design
 * (`CommerceBasicsFields`, `CommerceContactFields`, `CommerceLocationFields`)
 * plus the `HorarioEditor`; sectioned forms compose the groups into their own
 * cards, while `CommerceFields` renders them flat for the single-card admin
 * forms. Business-rule validation itself lives in the backend
 * (`lib/commerce.assertValidCommerceForm`) and is reused there too.
 */


/**
 * Red asterisk marking a required field. `aria-hidden`: assistive tech already
 * gets the requirement from validation errors; the mark is a visual cue only.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      {" "}*
    </span>
  );
}

export type CommerceFieldsValues = {
  name: string;
  category: string;
  description: string;
  infoExtra?: string;
  whatsapp: string;
  instagram?: string;
  contactName: string;
  resides: string;
  notas?: string;
};

type FormOptions = FunctionReturnType<
  typeof api.table.commerces.getFormOptions
>;

/** « Información básica » — name, category (+ Comida sub-categories), description. */
export function CommerceBasicsFields({
  control,
  options,
  isComida,
  subcategories,
  onToggleSubcategory,
}: {
  control: Control<CommerceFieldsValues>;
  options: FormOptions;
  isComida: boolean;
  subcategories: string[];
  onToggleSubcategory: (value: string, checked: boolean) => void;
}) {
  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="name">Nombre del negocio<RequiredMark /></FieldLabel>
            <Input {...field} id="name" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="category">Categoría<RequiredMark /></FieldLabel>
            <NativeSelect
              {...field}
              id="category"
              aria-invalid={fieldState.invalid}
              className="w-full"
            >
              <NativeSelectOption value="">
                Selecciona una categoría
              </NativeSelectOption>
              {options.categories.map((cat) => (
                <NativeSelectOption key={cat} value={cat}>
                  {cat}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {isComida && (
        <Field>
          <FieldLabel>Subcategorías</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.comidaSubcategories.map((sub) => {
              const id = `sub-${sub}`;
              return (
                <div key={sub} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={subcategories.includes(sub)}
                    onCheckedChange={(checked) =>
                      onToggleSubcategory(sub, checked === true)
                    }
                  />
                  <Label htmlFor={id} className="font-normal">
                    {sub}
                  </Label>
                </div>
              );
            })}
          </div>
        </Field>
      )}

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="description">Descripción<RequiredMark /></FieldLabel>
            <Textarea
              {...field}
              id="description"
              aria-invalid={fieldState.invalid}
              rows={3}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="infoExtra"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="infoExtra">Información extra</FieldLabel>
            <Textarea
              {...field}
              id="infoExtra"
              rows={2}
              placeholder="Métodos de pago, zonas de cobertura, envíos…"
            />
            <FieldDescription>
              Se muestra al final de la ficha, como texto secundario.
            </FieldDescription>
          </Field>
        )}
      />
    </>
  );
}

/** « Contacto » — WhatsApp, Instagram, contact name. */
export function CommerceContactFields({
  control,
}: {
  control: Control<CommerceFieldsValues>;
}) {
  return (
    <>
      <Controller
        name="whatsapp"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="whatsapp">WhatsApp<RequiredMark /></FieldLabel>
            <Input
              {...field}
              id="whatsapp"
              inputMode="numeric"
              placeholder="3001234567"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="instagram"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
            <Input
              {...field}
              id="instagram"
              placeholder="https://instagram.com/…"
            />
          </Field>
        )}
      />

      <Controller
        name="contactName"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="contactName">Nombre de contacto<RequiredMark /></FieldLabel>
            <Input {...field} id="contactName" />
          </Field>
        )}
      />
    </>
  );
}

/** « Ubicación y detalles » — resides, internal notes. */
export function CommerceLocationFields({
  control,
  options,
  residesLabel = "¿Resides en Monteazul?",
  notasLabel = "Notas",
}: {
  control: Control<CommerceFieldsValues>;
  options: FormOptions;
  residesLabel?: string;
  notasLabel?: string;
}) {
  return (
    <>
      <Controller
        name="resides"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="resides">{residesLabel}<RequiredMark /></FieldLabel>
            <NativeSelect
              {...field}
              id="resides"
              aria-invalid={fieldState.invalid}
              className="w-full"
            >
              <NativeSelectOption value="">
                Selecciona una opción
              </NativeSelectOption>
              {options.residesValues.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="notas"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="notas">{notasLabel}</FieldLabel>
            <Textarea {...field} id="notas" rows={2} />
          </Field>
        )}
      />
    </>
  );
}

/** The flat composition — all fiche fields in one column, for the admin forms. */
export function CommerceFields({
  control,
  options,
  isComida,
  subcategories,
  onToggleSubcategory,
  horario,
  onHorarioChange,
  horarioError,
  residesLabel,
  notasLabel,
}: {
  control: Control<CommerceFieldsValues>;
  options: FormOptions;
  isComida: boolean;
  subcategories: string[];
  onToggleSubcategory: (value: string, checked: boolean) => void;
  horario: Horario;
  onHorarioChange: (next: Horario) => void;
  horarioError: string | null;
  residesLabel?: string;
  notasLabel?: string;
}) {
  return (
    <>
      <CommerceBasicsFields
        control={control}
        options={options}
        isComida={isComida}
        subcategories={subcategories}
        onToggleSubcategory={onToggleSubcategory}
      />

      <CommerceContactFields control={control} />

      <HorarioEditor
        value={horario}
        onChange={onHorarioChange}
        error={horarioError}
      />

      <CommerceLocationFields
        control={control}
        options={options}
        residesLabel={residesLabel}
        notasLabel={notasLabel}
      />
    </>
  );
}
