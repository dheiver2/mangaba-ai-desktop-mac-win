#!/usr/bin/env python3
"""Gera o documento institucional do software Mangaba AI em PDF."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, NextPageTemplate, ListFlowable, ListItem,
)
from reportlab.lib.enums import TA_CENTER

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "Mangaba-AI-Sobre-o-Software.pdf")
LOGO = "/tmp/mangaba-logo-pdf.png"

ORANGE = colors.HexColor("#FF7A1A")
RED = colors.HexColor("#E94A12")
GREEN = colors.HexColor("#689924")
YELLOW = colors.HexColor("#FFD83D")
GREEN_L = colors.HexColor("#7BBF26")
CREAM = colors.HexColor("#FFFCF0")
DARK = colors.HexColor("#403731")
INK = colors.HexColor("#2B211B")

st = {
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=20, textColor=ORANGE,
                         spaceBefore=16, spaceAfter=8, leading=24),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12.5, textColor=DARK,
                         spaceBefore=10, spaceAfter=5, leading=16),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, textColor=INK,
                           leading=16, spaceAfter=6),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#7a6e63"), leading=13),
    "li": ParagraphStyle("li", fontName="Helvetica", fontSize=10.5, textColor=INK, leading=15),
    "cellh": ParagraphStyle("cellh", fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.white, leading=13),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=13),
    "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK, leading=13),
}


def table(rows, widths, head=ORANGE):
    data = [[Paragraph(c, st["cellh"]) for c in rows[0]]]
    for r in rows[1:]:
        data.append([Paragraph(c, st["cell"]) for c in r])
    t = Table(data, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), head),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EADFD2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(i, st["li"]), bulletColor=ORANGE) for i in items],
        bulletType="bullet", start="•", leftIndent=14, spaceAfter=2,
    )


def build():
    doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm,
                          topMargin=18*mm, bottomMargin=18*mm,
                          title="Mangaba AI — Sobre o Software", author="Mangaba AI")
    fw, fh = A4[0]-40*mm, A4[1]-36*mm

    def footer(c, d):
        c.saveState()
        c.setFillColor(colors.HexColor("#9a8d80")); c.setFont("Helvetica", 8)
        c.drawString(20*mm, 10*mm, "Mangaba AI — Sobre o Software")
        c.drawRightString(A4[0]-20*mm, 10*mm, "Pag. %d" % d.page)
        c.setStrokeColor(ORANGE); c.setLineWidth(1.2)
        c.line(20*mm, 13*mm, A4[0]-20*mm, 13*mm); c.restoreState()

    def cover_bg(c, d):
        c.saveState(); c.setFillColor(CREAM); c.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        for i, col in enumerate([YELLOW, ORANGE, GREEN_L]):
            c.setFillColor(col); c.rect(0, 0, A4[0], 8*mm - i*2.6*mm, fill=1, stroke=0)
        c.restoreState()

    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[Frame(20*mm, 40*mm, fw, fh-40*mm)], onPage=cover_bg),
        PageTemplate(id="Main", frames=[Frame(20*mm, 18*mm, fw, fh)], onPage=footer),
    ])

    s = []
    # CAPA
    s.append(Spacer(1, 28*mm))
    if os.path.exists(LOGO):
        img = Image(LOGO, width=52*mm, height=52*mm); img.hAlign = "CENTER"; s.append(img)
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph("Mangaba AI", ParagraphStyle("ct", fontName="Helvetica-Bold",
             fontSize=34, textColor=ORANGE, alignment=TA_CENTER, leading=38)))
    s.append(Paragraph("Assistente de IA local, privado e em português",
             ParagraphStyle("cs", fontName="Helvetica", fontSize=14, textColor=DARK,
             alignment=TA_CENTER, spaceBefore=4)))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph("Visão geral do software · versão 0.9.6",
             ParagraphStyle("cd", fontName="Helvetica", fontSize=10,
             textColor=colors.HexColor("#9a8d80"), alignment=TA_CENTER)))
    s.append(NextPageTemplate("Main")); s.append(PageBreak())

    # 1. O QUE É
    s.append(Paragraph("1. O que é o Mangaba AI", st["h1"]))
    s.append(Paragraph(
        "O <b>Mangaba AI</b> é um aplicativo de desktop (Mac e Windows) que oferece um "
        "<b>assistente de inteligência artificial 100% local e privado</b>. Toda a conversa "
        "e o processamento acontecem na própria máquina do usuário — <b>nada é enviado para a "
        "nuvem</b>. O assistente tem identidade brasileira, nordestina e sergipana, fala "
        "português do Brasil e é especialista em <b>gestão de empresas</b>.", st["body"]))
    s.append(Paragraph(
        "Diferente de serviços como ChatGPT (que dependem de servidores externos), o Mangaba AI "
        "roda o modelo de IA localmente, garantindo privacidade total e funcionamento offline "
        "após a configuração inicial.", st["body"]))

    # 2. O QUE FAZ
    s.append(Paragraph("2. O que ele faz", st["h1"]))
    s.append(bullets([
        "<b>Conversa por chat</b> com um assistente de IA, em português do Brasil.",
        "<b>Consultoria de gestão</b>: fluxo de caixa, precificação, plano de negócios, "
        "marketing e vendas, gestão de pessoas, formalização (MEI/Simples).",
        "<b>Base de conhecimento (RAG)</b>: envie documentos e converse sobre o conteúdo deles.",
        "<b>Histórico de conversas</b> e múltiplos chats organizados.",
        "<b>Contas de usuário</b> com cadastro local e área administrativa.",
        "<b>Atalhos prontos</b> de gestão na tela inicial para começar rápido.",
    ]))

    # 3. PARA QUEM
    s.append(Paragraph("3. Para quem é", st["h1"]))
    s.append(table([
        ["Público", "Como ajuda"],
        ["Empreendedores e PMEs", "Consultoria de gestão acessível, em português, sem custo de nuvem"],
        ["Profissionais autônomos", "Apoio em finanças, preços e organização do negócio"],
        ["Quem preza privacidade", "IA que roda local, sem enviar dados para fora"],
        ["Uso offline", "Funciona sem internet após baixar o modelo"],
    ], [55*mm, 107*mm]))

    # 4. DIFERENCIAIS
    s.append(Paragraph("4. Diferenciais", st["h1"]))
    s.append(bullets([
        "<b>Privacidade total</b> — processamento 100% local, sem nuvem.",
        "<b>Português do Brasil nativo</b> — interface e assistente em PT-BR.",
        "<b>Identidade e nicho</b> — persona sergipana especialista em gestão.",
        "<b>Autossuficiente</b> — já vem com tudo embutido (não precisa instalar Python).",
        "<b>Gestão automática do motor de IA</b> — instala e configura sozinho.",
        "<b>Gratuito e sem assinatura</b> — sem mensalidade nem limite de uso.",
    ]))

    # 5. COMO FUNCIONA (ARQUITETURA)
    s.append(Paragraph("5. Como funciona", st["h1"]))
    s.append(Paragraph(
        "O Mangaba AI combina três camadas que trabalham juntas dentro do aplicativo:", st["body"]))
    s.append(table([
        ["Camada", "Tecnologia", "Função"],
        ["Interface", "SvelteKit + Electron", "A janela do app e a tela de chat"],
        ["Servidor", "Python (FastAPI)", "Lógica, contas, histórico e documentos"],
        ["Motor de IA", "Ollama + Gemma 4", "Executa o modelo de linguagem localmente"],
    ], [38*mm, 52*mm, 72*mm]))
    s.append(Paragraph(
        "O <b>modelo de IA</b> usado é o <b>Mangaba Gemma 4</b> — baseado no Gemma 4 (Google), "
        "quantizado para rodar com eficiência em computadores pessoais, com a persona Mangaba "
        "embutida.", st["body"]))

    # 6. PRIVACIDADE
    s.append(Paragraph("6. Privacidade e segurança", st["h1"]))
    s.append(bullets([
        "Nenhuma conexão externa para conversar — os dados ficam na máquina.",
        "Conexões externas (OpenAI etc.) vêm desativadas por padrão.",
        "O cadastro de usuário é local; não há base centralizada na nuvem.",
        "Único acesso à internet: baixar o motor de IA e o modelo na 1ª execução.",
    ]))

    # 7. INSTALAÇÃO
    s.append(Paragraph("7. Instalação e uso", st["h1"]))
    s.append(bullets([
        "Baixe o instalador (.dmg no Mac) e arraste o Mangaba AI para Aplicativos.",
        "Abra o app — na 1ª vez ele baixa e configura o motor de IA automaticamente.",
        "Crie sua conta (cadastro local) e comece a conversar.",
    ]))
    s.append(Paragraph("Requisitos: macOS Apple Silicon (M1/M2/M3). Internet apenas na primeira execução.", st["small"]))

    s.append(Spacer(1, 10))
    s.append(Paragraph("🥭 Mangaba AI — feito no Nordeste, para o Brasil.",
             ParagraphStyle("end", fontName="Helvetica-Oblique", fontSize=10,
             textColor=ORANGE, alignment=TA_CENTER)))

    doc.build(s)
    print("✓ PDF gerado:", OUT)


if __name__ == "__main__":
    build()
