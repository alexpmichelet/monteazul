import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

// Inlined from @packages/shared/constants to support React Email preview
const APP_NAME = "Directorio Monteazul";
const APP_ADDRESS = "60 rue François 1er, 75008 Paris, France";

interface AdminInviteEmailProps {
  name?: string;
  inviteUrl?: string;
}

export const AdminInviteEmail = ({
  name,
  inviteUrl = "https://admin.example.com/accept-invite?token=xxx",
}: AdminInviteEmailProps) => (
  <Html lang="es">
    <Head />
    <Tailwind>
      <Body className="bg-white font-plaid">
        <Preview>Invitación al equipo de administración de {APP_NAME}</Preview>
        <Container className="px-3 mx-auto">
          <Text className="text-[#51525C] text-sm my-2">
            {name ? `Hola, ${name}:` : "Hola:"}
          </Text>
          <Text className="text-[#51525C] text-sm my-2">
            Has recibido una invitación para unirte al equipo de administración
            de {APP_NAME}.
          </Text>
          <Text className="text-[#51525C] text-sm my-2">
            Haz clic en el botón para configurar tu cuenta y empezar:
          </Text>
          <Section className="text-center my-6">
            <Button
              className="bg-[#000000] rounded-md text-white text-sm font-semibold no-underline text-center px-5 py-3"
              href={inviteUrl}
            >
              Aceptar la invitación
            </Button>
          </Section>
          <Text className="text-[#51525C] text-sm my-2">
            Esta invitación caducará en 7 días.
          </Text>
          <Text className="text-[#51525C] text-sm my-2">
            Si no esperabas esta invitación, puedes ignorar este correo.
          </Text>
          <Text className="text-[#51525C] text-sm my-2">Gracias,</Text>
          <Text className="text-[#51525C] text-sm my-2">
            El equipo de {APP_NAME}
          </Text>
          <Hr />
          <Text className="text-[#51525C] text-sm my-2">
            © {new Date().getFullYear()} {APP_NAME}, {APP_ADDRESS}
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

AdminInviteEmail.PreviewProps = {
  name: "Ana",
  inviteUrl: "https://admin.example.com/accept-invite?token=abc123",
} as AdminInviteEmailProps;

export default AdminInviteEmail;
