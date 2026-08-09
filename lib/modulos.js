// Registro dos módulos do app.
//
// Para adicionar um módulo novo: crie a pasta em app/<id>/ e acrescente uma
// entrada aqui. A tela inicial e a barra de navegação se ajustam sozinhas.
import {
  Wallet,
  Dumbbell,
  LayoutDashboard,
  Upload,
  List,
  Settings,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  User,
} from "lucide-react";

export const MODULOS = [
  {
    id: "financeiro",
    nome: "Financeiro",
    descricao: "Gastos, receitas, pendências, parcelas e análises",
    base: "/financeiro",
    href: "/financeiro/dashboard", // por onde o módulo abre
    Icone: Wallet,
    cor: "#2a78d6",
    pronto: true,
    nav: [
      { href: "/financeiro/dashboard", rotulo: "Painel", Icone: LayoutDashboard },
      { href: "/financeiro/upload", rotulo: "Importar", Icone: Upload },
      { href: "/financeiro/historico", rotulo: "Histórico", Icone: List },
      { href: "/financeiro/pendencias", rotulo: "Pendências", Icone: Wallet },
      { href: "/financeiro/configuracoes", rotulo: "Config", Icone: Settings },
    ],
  },
  {
    id: "academia",
    nome: "Academia",
    descricao: "Acompanhamento de treinos",
    base: "/academia",
    href: "/academia",
    Icone: Dumbbell,
    cor: "#eb6834",
    pronto: true,
    // A biblioteca de exercícios fica acessível pela tela de Fichas —
    // cinco itens já é o limite do que cabe bem na barra do celular.
    nav: [
      { href: "/academia", rotulo: "Treino", Icone: LayoutDashboard },
      { href: "/academia/fichas", rotulo: "Fichas", Icone: ClipboardList },
      { href: "/academia/historico", rotulo: "Histórico", Icone: CalendarDays },
      { href: "/academia/evolucao", rotulo: "Evolução", Icone: TrendingUp },
      { href: "/academia/perfil", rotulo: "Perfil", Icone: User },
    ],
  },
];

// Qual módulo responde por esta URL? (null = tela inicial)
export function moduloDoCaminho(caminho) {
  if (!caminho) return null;
  return MODULOS.find((m) => caminho === m.base || caminho.startsWith(m.base + "/")) || null;
}
