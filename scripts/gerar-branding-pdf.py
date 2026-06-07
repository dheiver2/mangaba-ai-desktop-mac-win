#!/usr/bin/env python3
"""Gera o Manual de Marca Mangaba AI em PDF (identidade visual oficial)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, FrameBreak, NextPageTemplate,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "branding", "Mangaba-AI-Manual-de-Marca.pdf")
LOGO = "/tmp/mangaba-logo-pdf.png"

# Paleta oficial
ORANGE = colors.HexColor("#FF7A1A")
RED = colors.HexColor("#E94A12")
GREEN = colors.HexColor("#689924")
GREEN_L = colors.HexColor("#7BBF26")
YELLOW = colors.HexColor("#FFD83D")
CREAM = colors.HexColor("#FFFCF0")
PEACH = colors.HexColor("#FFDFCC")
DARK = colors.HexColor("#403731")
INK = colors.HexColor("#2B211B")

styles = {
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=22, textColor=ORANGE,
                         spaceBefore=18, spaceAfter=10, leading=26),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, textColor=DARK,
                         spaceBefore=12, spaceAfter=6, leading=16),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, textColor=INK,
                           leading=16, spaceAfter=6),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#7a6e63"),
                            leading=13),
    "cellh": ParagraphStyle("cellh", fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.white, leading=13),
    "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=13),
    "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK, leading=13),
}


def kv_table(rows, col_widths):
    data = [[Paragraph(c, styles["cellh"]) for c in rows[0]]]
    for r in rows[1:]:
        data.append([Paragraph(c, styles["cell"]) for c in r])
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ORANGE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EADFD2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def color_table():
    """Tabela de cores com swatch colorido."""
    rows = [
        ("Laranja Mangaba", "#FF7A1A", ORANGE, "Cor principal — botões, destaques, links", colors.white),
        ("Laranja-vermelho", "#E94A12", RED, "Hover, alertas, estados ativos", colors.white),
        ("Verde mangaba", "#689924", GREEN, "Sucesso, folha, tags", colors.white),
        ("Verde claro", "#7BBF26", GREEN_L, "Acentos, gradientes", colors.white),
        ("Amarelo polpa", "#FFD83D", YELLOW, "Realces, gradiente do fruto", DARK),
        ("Creme", "#FFFCF0", CREAM, "Fundo claro principal", DARK),
        ("Pêssego", "#FFDFCC", PEACH, "Fundo secundário", DARK),
        ("Marrom tinta", "#403731", DARK, "Texto principal", colors.white),
    ]
    data = [[Paragraph("Cor", styles["cellh"]), Paragraph("Amostra", styles["cellh"]),
             Paragraph("Hex", styles["cellh"]), Paragraph("Uso", styles["cellh"])]]
    swatch_styles = []
    for i, (name, hexc, col, use, txt) in enumerate(rows, start=1):
        data.append([Paragraph(name, styles["cellb"]), Paragraph(hexc, styles["cell"]),
                     Paragraph(hexc, styles["cell"]), Paragraph(use, styles["cell"])])
        swatch_styles.append(("BACKGROUND", (1, i), (1, i), col))
    t = Table(data, colWidths=[40*mm, 30*mm, 25*mm, 67*mm], hAlign="LEFT")
    base = [
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EADFD2")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    t.setStyle(TableStyle(base + swatch_styles))
    return t


def build():
    doc = BaseDocTemplate(OUT, pagesize=A4,
                          leftMargin=20*mm, rightMargin=20*mm,
                          topMargin=18*mm, bottomMargin=18*mm,
                          title="Mangaba AI — Manual de Marca", author="Mangaba AI")
    fw, fh = A4[0]-40*mm, A4[1]-36*mm

    def footer(canvas, d):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#9a8d80"))
        canvas.setFont("Helvetica", 8)
        canvas.drawString(20*mm, 10*mm, "Mangaba AI — Manual de Marca v1.0")
        canvas.drawRightString(A4[0]-20*mm, 10*mm, "Pag. %d" % d.page)
        canvas.setStrokeColor(ORANGE)
        canvas.setLineWidth(1.2)
        canvas.line(20*mm, 13*mm, A4[0]-20*mm, 13*mm)
        canvas.restoreState()

    # Capa: fundo creme
    def cover_bg(canvas, d):
        canvas.saveState()
        canvas.setFillColor(CREAM)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # faixa gradiente simples no rodapé da capa
        for i, c in enumerate([YELLOW, ORANGE, GREEN_L]):
            canvas.setFillColor(c)
            canvas.rect(0, 0, A4[0], 8*mm - i*2.6*mm, fill=1, stroke=0)
        canvas.restoreState()

    frame = Frame(20*mm, 18*mm, fw, fh, id="main")
    cover_frame = Frame(20*mm, 40*mm, fw, fh-40*mm, id="cover")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_bg),
        PageTemplate(id="Main", frames=[frame], onPage=footer),
    ])

    s = []
    # ---- CAPA ----
    s.append(Spacer(1, 30*mm))
    if os.path.exists(LOGO):
        img = Image(LOGO, width=55*mm, height=55*mm)
        img.hAlign = "CENTER"
        s.append(img)
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph("Mangaba AI", ParagraphStyle("ct", fontName="Helvetica-Bold",
             fontSize=34, textColor=ORANGE, alignment=TA_CENTER, leading=38)))
    s.append(Paragraph("Manual de Marca", ParagraphStyle("cs", fontName="Helvetica",
             fontSize=16, textColor=DARK, alignment=TA_CENTER, spaceBefore=4)))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph("Identidade visual e verbal · versão 1.0",
             ParagraphStyle("cd", fontName="Helvetica", fontSize=10,
             textColor=colors.HexColor("#9a8d80"), alignment=TA_CENTER)))
    s.append(NextPageTemplate("Main"))
    s.append(PageBreak())

    # ---- 1. A MARCA ----
    s.append(Paragraph("1. A marca", styles["h1"]))
    s.append(Paragraph(
        "<b>Mangaba AI</b> é um assistente de inteligência artificial <b>100% local e privado</b>, "
        "com identidade brasileira, nordestina e sergipana. O nome e o símbolo homenageiam a "
        "<b>mangaba</b> — fruta-símbolo de Sergipe — e a cultura das catadoras de mangaba.", styles["body"]))
    s.append(Paragraph("Essência", styles["h2"]))
    s.append(kv_table([
        ["Atributo", "Significado"],
        ["Raiz", "Orgulho sergipano e nordestino; cultura da mangaba"],
        ["Privacidade", "Roda na máquina do usuário, sem nuvem"],
        ["Acessível", "Português do Brasil nativo, tom acolhedor"],
        ["Competente", "Especialista em gestão de empresas"],
    ], [42*mm, 120*mm]))
    s.append(Paragraph("Personalidade", styles["h2"]))
    s.append(Paragraph(
        "Calorosa, acolhedora e prática — com a hospitalidade do Nordeste, sem caricatura. "
        "Fala como uma consultora de confiança: clara, objetiva e próxima.", styles["body"]))

    # ---- 2. LOGOTIPO ----
    s.append(Paragraph("2. Logotipo", styles["h1"]))
    s.append(Paragraph(
        "O símbolo é a <b>mangaba</b> (fruta com folha) sobre um cartão de cantos arredondados, "
        "acompanhado do wordmark <b>mangaba.ai</b>.", styles["body"]))
    s.append(Paragraph("Regras de uso", styles["h2"]))
    s.append(kv_table([
        ["Faça ✓", "Evite ✗"],
        ["Manter a proporção original", "Distorcer ou esticar o logo"],
        ["Respeitar a área de respiro", "Reduzir abaixo do tamanho mínimo"],
        ["Usar sobre creme/branco ou marrom escuro", "Recolorir o símbolo fora da paleta"],
        ["Preservar o contraste", "Sombras/contornos não previstos"],
    ], [81*mm, 81*mm]))
    s.append(Paragraph("Tamanho mínimo: ícone 32 px · logo com wordmark 96 px de altura.", styles["small"]))

    # ---- 3. PALETA ----
    s.append(Paragraph("3. Paleta de cores", styles["h1"]))
    s.append(Paragraph("Cores extraídas diretamente do logotipo oficial.", styles["body"]))
    s.append(color_table())
    s.append(Spacer(1, 4))
    s.append(Paragraph("Gradiente do fruto: #FFD83D (amarelo) → #FF7A1A (laranja) → #7BBF26 (verde).", styles["small"]))

    # ---- 4. TIPOGRAFIA ----
    s.append(Paragraph("4. Tipografia", styles["h1"]))
    s.append(Paragraph(
        "Interface: fonte do sistema — <b>-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI'</b>. "
        "Suavização (antialiasing) ativa e <b>letter-spacing -0.011em</b> para sensação nativa. "
        "Títulos em semibold; corpo em regular com line-height 1.7 para leitura confortável.", styles["body"]))

    # ---- 5. TOM DE VOZ ----
    s.append(Paragraph("5. Tom de voz", styles["h1"]))
    s.append(Paragraph("A Mangaba sempre fala em <b>português do Brasil</b>.", styles["body"]))
    s.append(kv_table([
        ["Faça", "Evite"],
        ["Tom acolhedor e próximo", "Frieza corporativa"],
        ["Linguagem clara e direta", "Jargão técnico desnecessário"],
        ["Passos práticos e acionáveis", "Respostas vagas"],
        ["Valorizar a cultura local", "Caricatura/estereótipo forçado"],
    ], [81*mm, 81*mm]))
    s.append(Paragraph("Exemplos", styles["h2"]))
    s.append(Paragraph("• Saudação: <i>“Olá! Sou a Mangaba 🥭” / “Olá, {nome} 🥭”</i>", styles["body"]))
    s.append(Paragraph("• Gestão: <i>“Vamos organizar seu fluxo de caixa passo a passo?”</i>", styles["body"]))
    s.append(Paragraph("• Privacidade: <i>“A Mangaba não faz nenhuma conexão externa — seus dados ficam só na sua máquina.”</i>", styles["body"]))

    # ---- 6. APLICAÇÕES + 7. NOMENCLATURA ----
    s.append(Paragraph("6. Aplicações no produto", styles["h1"]))
    s.append(kv_table([
        ["Tela", "Aplicação da marca"],
        ["Login", "Logo grande centralizado, botão laranja, fundo creme"],
        ["Carregamento (splash)", "Logo + barra de progresso com gradiente do fruto"],
        ["Chat (início)", "Saudação “Olá, {nome} 🥭” + atalhos de gestão"],
        ["Ícone do app / Dock", "Símbolo da mangaba em cartão"],
        ["Modelo de IA", "Exibido como Mangaba Gemma 4"],
    ], [50*mm, 112*mm]))
    s.append(Paragraph("7. Nomenclatura", styles["h1"]))
    s.append(kv_table([
        ["Elemento", "Forma correta"],
        ["Produto", "Mangaba AI"],
        ["Assistente / IA", "a Mangaba"],
        ["Modelo", "Mangaba Gemma 4 (mangaba-gemma4)"],
        ["Wordmark / domínio", "mangaba.ai"],
    ], [50*mm, 112*mm]))
    s.append(Paragraph("Escreva sempre “Mangaba AI” (com espaço). Evite “MangabaAI”.", styles["small"]))
    s.append(Spacer(1, 8))
    s.append(Paragraph("🥭 Mangaba AI — feito no Nordeste, para o Brasil.",
             ParagraphStyle("end", fontName="Helvetica-Oblique", fontSize=10,
             textColor=ORANGE, alignment=TA_CENTER)))

    doc.build(s)
    print("✓ PDF gerado:", OUT)


if __name__ == "__main__":
    build()
