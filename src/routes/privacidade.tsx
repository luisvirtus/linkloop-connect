import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

const url = "https://www.votona.com.br/privacidade";
export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Votona" },
      { name: "description", content: "Como a Votona coleta, usa e protege dados pessoais conforme a LGPD." },
      { property: "og:title", content: "Política de Privacidade — Votona" },
      { property: "og:description", content: "Tratamento de dados pessoais na Votona conforme a LGPD." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: () => (
    <LegalPage title="Política de Privacidade" updated="18 de novembro de 2026">
      <p>Esta política explica como a Votona trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><b>Login com Google:</b> nome, e-mail e foto do perfil, fornecidos pelo Google com sua autorização. Não recebemos sua senha.</li>
        <li><b>Cadastro de empresas e vendedores:</b> nome, WhatsApp, CPF ou CNPJ e endereço.</li>
        <li><b>Página pública:</b> nome da empresa, logo, links e cardápio que o cliente decide publicar. Documentos e endereços nunca aparecem na página pública.</li>
        <li><b>Atendimento na mesa:</b> ao chamar atendente ou enviar pedido, registramos a mesa, os itens e um código temporário guardado no navegador do visitante por até 90 minutos, sem identificá-lo.</li>
        <li><b>Financeiro:</b> vendas, anuidades, recebimentos e comissões.</li>
      </ul>
      <h2>2. Para que usamos</h2>
      <p>Para permitir o acesso à conta, vincular plaquinhas, exibir a página pública, controlar assinaturas e comissões, encaminhar chamados e pedidos à equipe do estabelecimento e prestar suporte. Não vendemos dados pessoais.</p>
      <h2>3. Estatísticas de visitas</h2>
      <p>Usamos as estatísticas de visitas da Lovable, que não usam cookies, não armazenam nada no dispositivo do visitante, não guardam endereços IP e não identificam visitantes. São registradas para todos os visitantes as páginas visitadas, a origem da visita, o país, o navegador, o sistema operacional e o tipo de dispositivo, o tempo de permanência, a velocidade de carregamento e erros. Dados detalhados ficam guardados por 90 dias e resumos diários por um ano. A Lovable coleta esses dados para nós. A <a href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">política de privacidade da Lovable</a> explica como ela os trata.</p>
      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li><b>Google:</b> autenticação da conta; o botão de avaliação leva ao Google.</li>
        <li><b>Provedor de hospedagem e banco de dados</b> da plataforma, que armazena os dados com segurança.</li>
        <li><b>Telegram:</b> chamados e pedidos são enviados ao grupo da equipe do estabelecimento.</li>
        <li><b>Google Fonts:</b> as fontes do site são carregadas do Google, que recebe dados técnicos do navegador.</li>
        <li><b>WhatsApp:</b> ao clicar no botão de contato, você é levado ao WhatsApp.</li>
      </ul>
      <p>A sessão de login é mantida no navegador para que você continue conectado.</p>
      <h2>5. Seus direitos</h2>
      <p>Você pode solicitar confirmação, acesso, correção, anonimização, portabilidade ou eliminação dos seus dados, além de revogar consentimentos. Dados financeiros podem ser mantidos pelo prazo exigido em lei.</p>
      <h2>6. Segurança e retenção</h2>
      <p>Adotamos controle de acesso por perfil e registros de auditoria. Mantemos os dados enquanto a conta estiver ativa ou conforme obrigações legais.</p>
      <h2>7. Contato</h2>
      <p>Para exercer seus direitos, fale conosco pelo WhatsApp <a href="https://wa.me/5541988083645">(41) 98808-3645</a>.</p>
    </LegalPage>
  ),
});
