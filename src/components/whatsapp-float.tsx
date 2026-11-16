import { FaWhatsapp } from "react-icons/fa";
import { SUPPORT_WHATSAPP_LABEL, SUPPORT_WHATSAPP_URL } from "@/lib/support-contact";

export function WhatsAppFloat() {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com o suporte no WhatsApp ${SUPPORT_WHATSAPP_LABEL}`}
      title={`Suporte no WhatsApp ${SUPPORT_WHATSAPP_LABEL}`}
      className="whatsapp-float fixed bottom-3 right-3 z-50 flex h-[46px] w-[46px] items-center justify-center rounded-full shadow-lift transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none print:hidden sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <FaWhatsapp className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
    </a>
  );
}
