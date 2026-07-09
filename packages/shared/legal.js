/**
 * Legal documents of the Plataforma Monteazul — single source of truth shared
 * by the public annuaire (apps/web) and the back-office (apps/admin), which
 * each render them on their own /terminos and /privacidad routes so the
 * sign-up consent links work regardless of the app's domain.
 *
 * Content authored by the product owner (10 de julio de 2026). Update HERE,
 * never in the app renderers.
 */

/** @typedef {import("./legal").LegalDoc} LegalDoc */

/** @type {LegalDoc} */
export const TERMINOS = {
  slug: "terminos",
  title: "Términos y Condiciones de Uso",
  subtitle: "Plataforma Monteazul — Directorio de Emprendimientos",
  updatedAt: "10 de julio de 2026",
  intro: [
    "Los presentes Términos y Condiciones (que llamaremos los « Términos ») regulan el acceso y uso de la plataforma web Monteazul (que llamaremos la « Plataforma »), un directorio digital cuyo único fin es dar visibilidad a los emprendimientos y negocios de la comunidad y facilitar el contacto entre estos y las personas interesadas. Al acceder o utilizar la Plataforma, el usuario acepta de forma plena y sin reservas estos Términos. Si no está de acuerdo, deberá abstenerse de usar la Plataforma.",
  ],
  sections: [
    {
      heading: "1. Responsable de la Plataforma",
      blocks: [
        {
          type: "p",
          text: "La Plataforma es administrada por Ana Camila Sánchez García, persona natural (que llamaremos la « Administradora »), quien actúa como responsable de su operación y de la gestión de los datos personales que en ella se tratan.",
        },
        { type: "p", text: "Correo de contacto: anacgsanchez18@gmail.com" },
      ],
    },
    {
      heading: "2. Objeto y naturaleza del servicio",
      blocks: [
        {
          type: "p",
          text: "La Plataforma es un directorio informativo que reúne y organiza, por categorías, los emprendimientos y negocios de la comunidad Monteazul, permitiendo que las personas interesadas los encuentren con facilidad y se comuniquen directamente con cada emprendedor a través de WhatsApp.",
        },
        {
          type: "p",
          text: "La Plataforma actúa únicamente como INTERMEDIARIO que facilita el contacto entre las partes. En consecuencia:",
        },
        {
          type: "ul",
          items: [
            "La Administradora no vende, produce, distribuye ni entrega ninguno de los productos o servicios publicados.",
            "La Administradora no interviene, gestiona ni procesa pagos entre compradores y emprendedores. Cualquier transacción, pago, acuerdo o entrega ocurre por fuera de la Plataforma y bajo la exclusiva responsabilidad de las partes involucradas.",
            "La relación comercial y contractual se establece directa y exclusivamente entre el emprendedor y la persona interesada.",
          ],
        },
      ],
    },
    {
      heading: "3. Uso gratuito (etapa actual)",
      blocks: [
        {
          type: "p",
          text: "En su etapa actual, el uso de la Plataforma es gratuito tanto para los emprendedores como para los visitantes. La Administradora podrá, en el futuro, establecer un aporte o costo para los emprendedores con el fin de sostener la operación de la Plataforma. Cualquier cambio de esta naturaleza será informado previamente y no se aplicará ningún cobro sin aviso y aceptación previa del emprendedor.",
        },
      ],
    },
    {
      heading: "4. Cuentas de usuario",
      blocks: [
        {
          type: "p",
          text: "La Plataforma puede navegarse libremente sin necesidad de registro. Sin embargo, el registro con correo electrónico es necesario para acceder a ciertas funciones:",
        },
        {
          type: "ul",
          items: [
            "Emprendedores: crean una cuenta para publicar y gestionar la información de su emprendimiento.",
            "Visitantes: pueden registrar voluntariamente su correo para usar funciones como guardar favoritos. El registro es opcional; sin él, igualmente pueden navegar y contactar por WhatsApp.",
          ],
        },
        {
          type: "p",
          text: "El usuario es responsable de la veracidad de los datos que suministra y de mantener la confidencialidad de sus credenciales de acceso.",
        },
      ],
    },
    {
      heading: "5. Publicación de contenidos y moderación",
      blocks: [
        {
          type: "p",
          text: "Toda publicación de un emprendimiento está sujeta a un proceso de aprobación previa por parte de la Administradora. Ningún contenido se publica automáticamente: requiere revisión y aprobación antes de aparecer en la Plataforma.",
        },
        {
          type: "p",
          text: "La Administradora se reserva el derecho de rechazar, editar o eliminar, en cualquier momento y a su criterio, cualquier contenido que resulte falso, engañoso, inapropiado, ofensivo, ilegal o contrario a estos Términos, incluso si fue publicado por error.",
        },
      ],
    },
    {
      heading: "6. Obligaciones del emprendedor",
      blocks: [
        {
          type: "p",
          text: "El emprendedor que publica en la Plataforma se compromete a:",
        },
        {
          type: "ul",
          items: [
            "Suministrar información veraz, actualizada y no engañosa sobre sus productos o servicios.",
            "Contar con los derechos sobre las imágenes y contenidos que publica.",
            "Cumplir la normativa aplicable a su actividad (sanitaria, comercial, tributaria, etc.), siendo el único responsable de ello.",
            "Responder directamente ante los compradores por la calidad, entrega, garantía y cumplimiento de lo que ofrece.",
          ],
        },
      ],
    },
    {
      heading: "7. Limitación de responsabilidad",
      blocks: [
        {
          type: "p",
          text: "Dado su rol de simple intermediario, la Administradora no garantiza ni se responsabiliza por: la calidad, seguridad, legalidad o veracidad de los productos o servicios publicados; el cumplimiento de las entregas, pagos o acuerdos entre las partes; ni por daños, perjuicios o inconvenientes derivados de las transacciones o del contacto entre emprendedores y compradores.",
        },
        {
          type: "p",
          text: "El uso de la Plataforma y la decisión de contactar o contratar a un emprendedor son de exclusiva responsabilidad del usuario. La Administradora tampoco garantiza la disponibilidad ininterrumpida de la Plataforma y podrá suspenderla temporalmente por mantenimiento u otras causas.",
        },
      ],
    },
    {
      heading: "8. Propiedad intelectual",
      blocks: [
        {
          type: "p",
          text: "El nombre, diseño y organización de la Plataforma pertenecen a la Administradora. Los contenidos, marcas e imágenes de cada emprendimiento pertenecen a sus respectivos titulares, quienes autorizan su publicación en la Plataforma con el fin de darse a conocer.",
        },
      ],
    },
    {
      heading: "9. Protección de datos personales",
      blocks: [
        {
          type: "p",
          text: "El tratamiento de los datos personales de los usuarios se rige por la Política de Privacidad de la Plataforma, disponible por separado y que hace parte integral de estos Términos, y se realiza conforme a la Ley 1581 de 2012 y demás normas colombianas sobre protección de datos.",
        },
      ],
    },
    {
      heading: "10. Modificaciones",
      blocks: [
        {
          type: "p",
          text: "La Administradora podrá modificar estos Términos en cualquier momento. Los cambios se informarán a través de la Plataforma y regirán desde su publicación. El uso continuado de la Plataforma implica la aceptación de los Términos vigentes.",
        },
      ],
    },
    {
      heading: "11. Ley aplicable y jurisdicción",
      blocks: [
        {
          type: "p",
          text: "Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces y tribunales competentes de Colombia.",
        },
      ],
    },
    {
      heading: "12. Contacto",
      blocks: [
        {
          type: "p",
          text: "Para cualquier duda, solicitud o reclamo relacionado con estos Términos, el usuario puede escribir a: anacgsanchez18@gmail.com.",
        },
      ],
    },
  ],
};

/** @type {LegalDoc} */
export const PRIVACIDAD = {
  slug: "privacidad",
  title: "Política de Privacidad y Tratamiento de Datos Personales",
  subtitle: "Plataforma Monteazul — Directorio de Emprendimientos",
  updatedAt: "10 de julio de 2026",
  intro: [
    "Esta Política de Privacidad describe cómo se recolectan, usan, almacenan y protegen los datos personales de los usuarios de la plataforma Monteazul (que llamaremos la « Plataforma »), en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas colombianas sobre protección de datos personales (Habeas Data).",
  ],
  sections: [
    {
      heading: "1. Responsable del tratamiento",
      blocks: [
        {
          type: "p",
          text: "La responsable del tratamiento de los datos personales es Ana Camila Sánchez García, persona natural, quien administra la Plataforma.",
        },
        {
          type: "p",
          text: "Correo de contacto para asuntos de datos personales: anacgsanchez18@gmail.com",
        },
      ],
    },
    {
      heading: "2. Datos que se recolectan",
      blocks: [
        {
          type: "p",
          text: "La Plataforma recolecta los siguientes datos, según el tipo de usuario:",
        },
        { type: "p", text: "a) Emprendedores que se registran y publican:" },
        {
          type: "ul",
          items: [
            "Nombre del negocio y nombre de contacto.",
            "Número de WhatsApp.",
            "Correo electrónico.",
            "Ubicación dentro de la comunidad (torre y apartamento) e indicación de si reside en Monteazul o cerca/lejos de la zona.",
            "Información del emprendimiento: descripción, productos o servicios, horarios, condiciones de domicilio, exclusividad en Monteazul, disponibilidad por pedido, e imágenes o PDF de portafolio que el emprendedor decida cargar.",
          ],
        },
        { type: "p", text: "b) Visitantes que se registran voluntariamente:" },
        {
          type: "ul",
          items: [
            "Nombre (el que la persona decida usar) y correo electrónico, únicamente cuando decide registrarse para usar funciones como guardar favoritos. El registro es opcional: se puede navegar por la Plataforma sin entregar ningún dato.",
          ],
        },
        { type: "p", text: "c) Datos de uso (métricas anónimas):" },
        {
          type: "ul",
          items: [
            "La Plataforma contabiliza, de forma interna y anónima, el número de visitas a cada ficha y el número de clics en el botón de contacto por WhatsApp. Se trata de un conteo de eventos con fines estadísticos: NO se identifica a la persona que realiza el clic ni se asocia a datos personales.",
          ],
        },
      ],
    },
    {
      heading: "3. Finalidad del tratamiento",
      blocks: [
        { type: "p", text: "Los datos se utilizan exclusivamente para:" },
        {
          type: "ul",
          items: [
            "Publicar y mostrar los emprendimientos en el directorio, organizados por categorías.",
            "Permitir el contacto directo entre las personas interesadas y los emprendedores a través de WhatsApp.",
            "Gestionar las cuentas de usuario y funciones como guardar favoritos.",
            "Revisar y aprobar las publicaciones antes de su difusión.",
            "Elaborar estadísticas anónimas de uso (visitas y clics) para conocer el interés en cada emprendimiento.",
            "Comunicarse con los usuarios sobre el funcionamiento de la Plataforma.",
          ],
        },
        {
          type: "p",
          text: "Los datos no se utilizan para fines distintos a los aquí descritos, ni se venden o comercializan.",
        },
      ],
    },
    {
      heading: "4. Autorización",
      blocks: [
        {
          type: "p",
          text: "Al registrarse y suministrar sus datos, el usuario autoriza de manera libre, previa, expresa e informada el tratamiento de sus datos personales conforme a esta Política. Para los emprendedores, el envío del formulario de inscripción constituye dicha autorización.",
        },
      ],
    },
    {
      heading: "5. Almacenamiento y seguridad",
      blocks: [
        {
          type: "p",
          text: "Los datos se almacenan en una base de datos alojada en el servicio Convex. La Administradora adopta medidas razonables para proteger la información y evitar su acceso no autorizado, pérdida o alteración. No obstante, ningún sistema es completamente infalible, por lo que no puede garantizarse una seguridad absoluta.",
        },
      ],
    },
    {
      heading: "6. Compartición de datos con terceros",
      blocks: [
        {
          type: "p",
          text: "La Administradora no comparte, vende ni cede los datos personales a terceros, salvo a los proveedores tecnológicos estrictamente necesarios para el funcionamiento de la Plataforma (por ejemplo, el servicio de base de datos Convex), quienes actúan como encargados del tratamiento. Los datos publicados por los emprendedores en su ficha (nombre del negocio, descripción, WhatsApp, etc.) son, por su naturaleza, de carácter público dentro de la Plataforma, pues su fin es que las personas los conozcan y los contacten.",
        },
      ],
    },
    {
      heading: "7. Transferencia internacional de datos",
      blocks: [
        {
          type: "p",
          text: "Para el funcionamiento de la Plataforma, algunos datos se almacenan y procesan en servidores ubicados fuera de Colombia, a través del proveedor tecnológico Convex, cuyos servidores pueden estar localizados en otros países (como Estados Unidos). Al aceptar esta Política, el usuario autoriza expresamente dicha transferencia y transmisión internacional de sus datos. La Administradora procura que estos proveedores ofrezcan niveles adecuados de seguridad y protección conforme a la normativa colombiana aplicable.",
        },
      ],
    },
    {
      heading: "8. Derechos de los titulares",
      blocks: [
        {
          type: "p",
          text: "Conforme a la Ley 1581 de 2012, todo titular de datos tiene derecho a:",
        },
        {
          type: "ul",
          items: [
            "Conocer, actualizar y rectificar sus datos personales.",
            "Solicitar prueba de la autorización otorgada.",
            "Ser informado sobre el uso dado a sus datos.",
            "Revocar la autorización y/o solicitar la supresión de sus datos, cuando no exista un deber legal o contractual de conservarlos.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.",
          ],
        },
        {
          type: "p",
          text: "Para ejercer estos derechos, el titular puede escribir a anacgsanchez18@gmail.com indicando su solicitud. La Administradora atenderá los requerimientos en los plazos establecidos por la ley.",
        },
      ],
    },
    {
      heading: "9. Conservación de los datos",
      blocks: [
        {
          type: "p",
          text: "Los datos se conservan mientras el emprendimiento o la cuenta permanezcan activos en la Plataforma, o mientras sean necesarios para las finalidades descritas. Cuando un usuario solicita la eliminación de su cuenta o de su emprendimiento, sus datos se suprimen, salvo aquellos que deban conservarse por obligación legal.",
        },
      ],
    },
    {
      heading: "10. Menores de edad",
      blocks: [
        {
          type: "p",
          text: "La Plataforma está dirigida a personas mayores de edad. No se recolecta de forma consciente información de menores de edad. Si se detecta que un menor ha suministrado datos sin autorización de sus representantes, estos serán eliminados.",
        },
      ],
    },
    {
      heading: "11. Cambios en la Política",
      blocks: [
        {
          type: "p",
          text: "Esta Política puede actualizarse en cualquier momento. Los cambios se publicarán en la Plataforma con su respectiva fecha de actualización. El uso continuado implica la aceptación de la Política vigente.",
        },
      ],
    },
    {
      heading: "12. Contacto",
      blocks: [
        {
          type: "p",
          text: "Para preguntas, solicitudes o reclamos sobre el tratamiento de sus datos personales, escriba a: anacgsanchez18@gmail.com.",
        },
      ],
    },
  ],
};
