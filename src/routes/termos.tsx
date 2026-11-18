import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

const url = "https://www.votona.com.br/termos";
export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Votona" },
      { name: "description", content: "Regras de uso da plataforma Votona, plaquinhas QR, anuidade e recursos adicionais." },
      { property: "og:title", content: "Termos de Uso — Votona" },
      { property: "og:description", content: "Condições de uso das plaquinhas QR e serviços Votona." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: () => (
    <LegalPage title="Termos de Uso" updated="18 de novembro de 2026">
      <p>Ao usar a Votona você concorda com estes termos.</p>
      <h2>1. O serviço</h2>
      <p>A Votona fornece plaquinhas físicas com QR Code permanente que levam a uma página da empresa com avaliação no Google, links e, quando contratados, chamada de atendente e cardápio.</p>
      <h2>2. Conta e vínculo</h2>
      <p>O acesso é feito com conta Google. A plaquinha é vinculada a uma empresa pela leitura do QR Code. O cliente não pode transferir ou desvincular plaquinhas; apenas a administração da Votona pode fazê-lo.</p>
      <h2>3. Anuidade</h2>
      <p>Após a ativação, a plaquinha tem 12 meses de uso. Sem renovação, a avaliação no Google continua funcionando e os demais links ficam pausados até o pagamento.</p>
      <h2>4. Recursos adicionais</h2>
      <p>Chamar atendente e cardápio são opcionais, cobrados por plaquinha em ciclo mensal ou anual à escolha do cliente, e ficam ativos somente durante o período pago.</p>
      <h2>5. Responsabilidades do cliente</h2>
      <p>O cliente é responsável pelas informações, links, preços e cardápio publicados e pelo atendimento dos pedidos recebidos. É proibido publicar conteúdo ilegal ou enganoso.</p>
      <h2>6. Limitações</h2>
      <p>O QR Code não comprova a presença física do visitante. A Votona não se responsabiliza por indisponibilidade de serviços de terceiros, como Google, WhatsApp e Telegram.</p>
      <h2>7. Privacidade</h2>
      <p>O tratamento de dados segue a nossa <a href="/privacidade">Política de Privacidade</a>.</p>
      <h2>8. Contato</h2>
      <p>WhatsApp <a href="https://wa.me/5541988083645">(41) 98808-3645</a>.</p>
    </LegalPage>
  ),
});
