import { FaWhatsapp } from "react-icons/fa6";
import { SUPPORT_WHATSAPP_LABEL, SUPPORT_WHATSAPP_URL } from "@/lib/support-contact";

export function WhatsAppFloat() {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com o suporte no WhatsApp ${SUPPORT_WHATSAPP_LABEL}`}
      title={`Suporte no WhatsApp ${SUPPORT_WHATSAPP_LABEL}`}
      className="fixed bottom-4 right-4 z-50 flex min-h-14 min-w-14 items-center justify-center rounded-full bg-channel-whatsapp p-4 text-primary-foreground shadow-lift transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none print:hidden sm:bottom-6 sm:right-6"
    >
      <FaWhatsapp className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
