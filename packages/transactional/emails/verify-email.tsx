import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

// Inlined from @packages/shared/constants to support React Email preview
const APP_NAME = "Directorio Monteazul";
const APP_ADDRESS = "60 rue François 1er, 75008 Paris, France";

interface VerifyEmailProps {
  code?: string;
}

export const VerifyEmail = ({ code }: VerifyEmailProps) => (
  <Html lang="es">
    <Head />
    <Tailwind>
      <Body className="bg-white font-plaid">
        <Preview>Verifica tu correo electrónico</Preview>
        <Container className="px-3 mx-auto">
          <Text className="text-[#51525C] text-sm my-2">Hola:</Text>
          <Text className="text-[#51525C] text-sm my-2">
            Para verificar tu correo electrónico, utiliza el siguiente código:
          </Text>
          <Text className="text-[#51525C] text-semibold text-3xl my-6">
            <strong data-testid="verification-code">{code}</strong>
          </Text>
          <Text className="text-[#51525C] text-sm my-2">
            Este código solo será válido durante los próximos 20 minutos.
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

VerifyEmail.PreviewProps = {
  code: "548734",
} as VerifyEmailProps;

export default VerifyEmail;
