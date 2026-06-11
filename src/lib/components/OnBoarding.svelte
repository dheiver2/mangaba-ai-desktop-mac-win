<script>
	export let show = true;
	export let getStartedHandler = () => {};
</script>

{#if show}
	<!-- Boas-vindas Mangaba AI: fundo creme, logo, mensagem de gestão, botão laranja -->
	<div
		class="w-full h-screen max-h-[100dvh] relative flex items-center justify-center"
		style="background: linear-gradient(180deg, #FFFCF0 0%, #FFDFCC 100%);"
	>
		<div class="flex flex-col items-center text-center px-8 max-w-xl">
			<img
				src="/mangaba-logo.svg"
				alt="Mangaba AI"
				class="w-28 h-28 rounded-3xl shadow-xl"
				style="box-shadow: 0 12px 40px rgba(255,122,26,0.30);"
				draggable="false"
			/>

			<h1 class="mt-8 text-4xl lg:text-5xl font-semibold" style="color:#403731;">
				Bem-vindo ao <span style="color:#FF7A1A;">Mangaba AI</span>
			</h1>

			<p class="mt-4 text-base lg:text-lg leading-relaxed" style="color:#6b5d52;">
				Sua consultora de gestão empresarial, 100% local e privada.
				Converse em português sobre finanças, preços, marketing e muito mais —
				seus dados nunca saem da sua máquina.
			</p>

			<button
				aria-label="Começar"
				class="mt-10 px-10 py-3.5 rounded-full text-white font-semibold text-base transition hover:scale-[1.03] active:scale-100"
				style="background:#FF7A1A; box-shadow: 0 6px 24px rgba(255,122,26,0.35);"
				on:click={() => getStartedHandler()}
				on:mouseenter={(e) => (e.currentTarget.style.background = '#E94A12')}
				on:mouseleave={(e) => (e.currentTarget.style.background = '#FF7A1A')}
			>
				Começar
			</button>

			<p class="mt-6 text-xs" style="color:#9a8d80;">
				🥭 Feito no Nordeste, para o Brasil
			</p>
		</div>

		<!-- faixa com o gradiente do fruto no rodapé -->
		<div
			class="absolute bottom-0 left-0 w-full h-1.5"
			style="background: linear-gradient(90deg, #FFD83D, #FF7A1A, #7BBF26);"
		></div>
	</div>
{/if}
