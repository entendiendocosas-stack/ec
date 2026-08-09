import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { MatrixRainComponent } from './components/matrix-rain.component';

interface NewsItem {
  category: string;
  title: string;
  whatsappBody: string;
  twitterBody: string;
  hashtags: string;
  imagePrompt: string;
  videoPrompt: string;
  sourceUrl?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatrixRainComponent],
  template: `
<div class="min-h-screen bg-neutral-950 text-neutral-100 pb-20 font-sans selection:bg-teal-500 selection:text-white" [attr.data-agent-state]="agentStateStr()">
  <!-- DATA LAYER FOR AI AGENTS -->
  <div id="ai-agent-data-layer" style="display: none;" aria-hidden="true" data-agent-id="ai-layer">
    <span data-agent-id="status">{{ agentStateStr() }}</span>
    <span data-agent-id="error-msg">{{ error() || 'null' }}</span>
    <pre data-agent-id="json-output">{{ agentOutputJson() }}</pre>
    <pre data-agent-id="topics-available">{{ availableTopicsJson() }}</pre>
  </div>

  <!-- Header -->
  <header class="bg-neutral-900/80 border-b border-neutral-800 shadow-lg sticky top-0 z-30 backdrop-blur-md">
    <div class="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl shadow-lg shadow-teal-900/20 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <div class="leading-tight">
            <h1 class="text-lg sm:text-xl font-bold text-white tracking-tight">
              Entendiendo Cosas <span class="text-teal-400">AI</span>
            </h1>
            <p class="text-[11px] sm:text-xs text-neutral-400 font-medium tracking-wide uppercase">Asistente Editorial • México</p>
          </div>
        </div>
        <div class="hidden sm:block">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-800 text-teal-400 border border-neutral-700">
            <span class="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></span>
            Google Search Activado
          </span>
        </div>
        <!-- Mobile Status Indicator -->
        <div class="block sm:hidden">
          <div class="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]" title="Google Search Activado"></div>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    
    <!-- Controls Section -->
    <section class="bg-neutral-900/50 rounded-2xl border border-neutral-800 p-4 sm:p-6 mb-8 backdrop-blur-sm" style="background-image: radial-gradient(circle at top left, rgba(20, 184, 166, 0.05), transparent 30%), radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.03), transparent 30%);">
      <div class="flex items-center gap-3 mb-5">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-teal-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
         </svg>
         <h2 class="text-base sm:text-lg font-semibold text-white tracking-wider">Centro de Mando</h2>
      </div>

      <!-- Custom Search Input -->
      <div class="mb-6 relative group">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          @if (isUrl()) {
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          } @else {
            <svg class="h-5 w-5 text-neutral-500 group-focus-within:text-teal-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          }
        </div>
        <input 
          type="text" 
          [value]="customQuery()"
          (input)="onCustomQueryInput($event)"
          data-agent-id="input-query"
          [placeholder]="isUrl() ? 'Enlace detectado. Listo para analizar.' : 'Pega un ENLACE de noticia o escribe un tema...'"
          class="block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-neutral-950 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-inner"
          [class]="isUrl() 
            ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
            : 'border-neutral-700 focus:border-teal-500 focus:ring-teal-500/50'"
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          @if (isUrl()) {
             <span class="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-800 rounded px-1.5 py-0.5 tracking-wider">LINK DETECTADO</span>
          } @else {
             <span class="text-xs text-neutral-600 border border-neutral-800 rounded px-1.5 py-0.5">Opcional</span>
          }
        </div>
      </div>
      
      <!-- Topics Grid -->
      <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">FILTRAR POR TEMAS</h3>
      <div class="flex flex-wrap gap-2.5 mb-4" data-agent-id="topics-container">
        @for (topic of availableTopics; track topic) {
          <button 
            (click)="toggleTopic(topic)"
            [attr.data-agent-id]="'btn-topic-' + topic"
            class="px-4 py-2.5 sm:px-4 sm:py-2 rounded-xl text-sm font-medium transition-all duration-300 border select-none touch-manipulation active:scale-95 transform"
            [class]="isTopicSelected(topic) 
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 hover:bg-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.3),_inset_0_0_5px_rgba(20,184,166,0.2)]' 
              : 'bg-neutral-800/50 text-neutral-400 border-neutral-700/50 hover:bg-neutral-750/50 hover:text-neutral-200 hover:border-neutral-600/50'">
            {{ topic }}
          </button>
        }
      </div>

      <!-- Topic Management Buttons -->
      <div class="flex items-center gap-3 mb-6">
        <button (click)="selectAllTopics()" data-agent-id="btn-select-all" class="text-xs font-semibold text-neutral-400 hover:text-teal-400 transition-colors px-2 py-1">Seleccionar Todo</button>
        <div class="h-4 w-px bg-neutral-700"></div>
        <button (click)="clearAllTopics()" data-agent-id="btn-clear-all" class="text-xs font-semibold text-neutral-400 hover:text-rose-400 transition-colors px-2 py-1">Limpiar Selección</button>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-4 border-t border-neutral-800 pt-6">
        <button 
          (click)="generate()"
          data-agent-id="btn-generate"
          [disabled]="isLoading() || (!isUrl() && customQuery().trim() === '' && selectedTopics().size === 0)"
          [class]="isUrl() ? 'from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-900/30' : 'from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-900/30'"
          class="relative overflow-hidden w-full inline-flex items-center justify-center px-6 py-4 sm:py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-900 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98] group touch-manipulation">
          @if (isLoading()) {
            <div class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="relative z-10">Procesando...</span>
          } @else {
            @if (isUrl()) {
               <svg xmlns="http://www.w3.org/2000/svg" class="-ml-1 mr-2 h-5 w-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            } @else {
               <svg xmlns="http://www.w3.org/2000/svg" class="-ml-1 mr-2 h-5 w-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
            }
            <span class="relative z-10">{{ searchButtonText() }}</span>
          }
        </button>
        
        <!-- Standard Error Message -->
        @if (error() && !isOverloaded()) {
          <div class="w-full sm:w-auto flex items-center text-red-400 text-sm font-medium bg-red-900/20 px-4 py-3 rounded-xl border border-red-900/50 animate-in fade-in slide-in-from-top-2">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="flex-1">{{ error() }}</span>
          </div>
        }
      </div>
    </section>

    <!-- Credits Depleted Warning -->
    @if (isCreditsDepleted()) {
      <section class="mb-12 animate-in fade-in duration-700 relative" data-agent-id="credits-depleted-view">
        <div class="flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-neutral-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] max-w-2xl mx-auto">
          <div class="text-5xl mb-4 animate-bounce">⚠️</div>
          <h3 class="text-2xl font-bold text-amber-400 mb-2 font-mono tracking-tight">Créditos de Prepago Agotados</h3>
          <p class="text-neutral-300 mb-6 font-medium text-base leading-relaxed max-w-md">
            Tu API Key de Gemini en Google AI Studio se ha quedado sin saldo o créditos de prepago para procesar solicitudes.
          </p>
          <div class="bg-black/60 rounded-xl p-5 mb-6 border border-neutral-800 text-left w-full max-w-lg">
            <h4 class="text-amber-300 font-bold text-sm mb-2">Pasos para solucionarlo:</h4>
            <ol class="list-decimal list-inside text-xs text-neutral-400 space-y-2.5">
              <li>Ingresa a la consola de <a href="https://aistudio.google.com/projects" target="_blank" referrerpolicy="no-referrer" class="text-amber-400 hover:underline font-bold">Google AI Studio</a>.</li>
              <li>Selecciona tu proyecto activo y dirígete a la sección de administración de facturación.</li>
              <li>Recarga tu saldo de prepago o actualiza tus credenciales de pago.</li>
              <li>Una vez que se restablezca el saldo, vuelve aquí e intenta de nuevo.</li>
            </ol>
          </div>
          <button (click)="generate()" data-agent-id="btn-retry-credits" class="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors shadow-lg shadow-amber-900/50 uppercase tracking-wider text-xs">
            Reintentar Generación
          </button>
        </div>
      </section>
    }

    <!-- Matrix Overload Visual -->
    @if (isOverloaded() && !isCreditsDepleted()) {
      <section class="mb-12 animate-in fade-in duration-700 relative group" data-agent-id="overloaded-view">
        <app-matrix-rain class="block shadow-2xl shadow-green-900/20"></app-matrix-rain>
        
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
           <div class="bg-black/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)] max-w-lg w-full transform transition-all hover:scale-105 duration-500">
              <div class="text-4xl mb-4 animate-bounce">🤖</div>
              <h3 class="text-2xl font-bold text-green-400 mb-2 font-mono tracking-tighter glitch-effect">Lalo: Servicios Saturados</h3>
              <p class="text-green-100/80 mb-6 font-medium text-lg">Estamos procesando todas las noticias posibles, vuelve a intentar.</p>
              
              <button (click)="generate()" data-agent-id="btn-retry" class="px-6 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded-lg transition-colors shadow-lg shadow-green-900/50 uppercase tracking-widest text-sm">
                Reintentar Conexión
              </button>
           </div>
        </div>
      </section>
    }

    <!-- Results Section -->
    @if (generatedNews().length > 0 && !isOverloaded() && !isCreditsDepleted()) {
      <section class="animate-fade-in pb-8" data-agent-id="results-container">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            <span class="w-1.5 h-6 bg-teal-500 rounded-full"></span>
            Resultados
          </h2>
          <span class="text-xs font-mono text-teal-400 bg-teal-900/30 px-3 py-1.5 rounded-lg border border-teal-900/50">
            {{ generatedNews().length }} ITEMS
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          @for (item of generatedNews(); track $index) {
            <!-- Card -->
            <article [attr.data-agent-id]="'result-card-' + $index" class="bg-[#111] rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden flex flex-col h-full hover:border-neutral-700 transition-colors duration-300 group">
              <!-- Category Badge -->
              <div class="px-5 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/30">
                <span class="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase bg-blue-900/30 text-blue-300 border border-blue-800/50">
                  {{ item.category }}
                </span>
                @if (item.sourceUrl) {
                  <a [href]="item.sourceUrl" target="_blank" class="text-xs text-neutral-500 hover:text-teal-400 flex items-center gap-1.5 transition-colors touch-manipulation p-1" title="Ver fuente original">
                    <span class="truncate max-w-[120px] sm:max-w-[150px]">Fuente Verificada</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                }
              </div>

              <!-- Content Area -->
              <div class="p-5 flex-grow flex flex-col gap-6">
                
                <!-- WhatsApp Preview -->
                <div class="bg-[#0b141a] p-4 rounded-xl relative border border-neutral-800/50 shadow-inner flex flex-col" style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-blend-mode: overlay; background-opacity: 0.05;">
                   <div class="flex items-center gap-2 mb-2 text-[#e9edef]/60">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.445 0 .062 5.388.062 11.99c0 2.112.553 4.177 1.604 6.038L0 24l6.132-1.61c1.801.981 3.834 1.498 5.908 1.5h.005c6.604 0 11.987-5.388 11.987-11.99 0-3.201-1.243-6.211-3.498-8.468z"/></svg>
                      <span class="text-xs font-bold uppercase tracking-widest">Vista Previa WhatsApp</span>
                   </div>
                   <div class="self-start bg-[#202c33] rounded-tr-xl rounded-br-xl rounded-bl-xl p-3.5 max-w-[98%] text-[#e9edef] text-[15px] leading-relaxed shadow-sm relative border border-[#2a3942]">
                      <div class="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent transform rotate-90 z-10"></div>
                      <div class="whitespace-pre-wrap break-words select-text font-whatsapp">{{ item.whatsappBody }}</div>
                      <div class="text-[11px] text-neutral-500 text-right mt-1.5 flex justify-end items-center gap-1">
                        <span>12:45 PM</span>
                        <svg viewBox="0 0 16 15" width="16" height="15" class="text-teal-500 fill-current"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg>
                      </div>
                   </div>
                   <button
                     id="btn-copy-wa-{{$index}}"
                     (click)="copyToClipboard(item.whatsappBody, 'btn-copy-wa-' + $index)"
                     class="mt-3 w-full bg-[#1db954]/10 hover:bg-[#1db954]/20 border border-[#1db954]/30 text-[#1db954] text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                     </svg>
                     COPIAR PARA WHATSAPP
                   </button>
                </div>

                <!-- X (Twitter) Preview -->
                <div class="bg-black p-4 rounded-xl border border-neutral-800 shadow-xl flex flex-col gap-3">
                   <div class="flex items-center gap-2 text-white">
                      <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                      <span class="text-xs font-bold uppercase tracking-widest text-[#71767b]">Post para X (Twitter)</span>
                   </div>
                   <div class="text-[15px] leading-normal text-white selection:bg-blue-500/30 whitespace-pre-wrap break-words">
                      {{ item.twitterBody }}
                   </div>
                   <div class="flex flex-wrap gap-2 mt-1">
                      <span class="text-blue-400 text-sm font-medium">{{ item.hashtags }}</span>
                   </div>
                   <button
                     id="btn-copy-x-{{$index}}"
                     (click)="copyToClipboard(item.twitterBody + ' ' + item.hashtags, 'btn-copy-x-' + $index)"
                     class="mt-1 w-full bg-white/5 hover:bg-white/10 border border-neutral-700 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                     </svg>
                     Copiar Post + Hashtags
                   </button>
                </div>

                <!-- Prompt Blocks Section -->
                <div class="grid gap-3">
                   <!-- Image Prompt -->
                   <div class="bg-neutral-900/50 rounded-lg border border-neutral-800 p-3 flex flex-col gap-2 group/prompt">
                      <div class="flex items-center justify-between">
                         <div class="flex items-center gap-2 text-indigo-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span class="text-xs font-bold tracking-wider uppercase">Prompt Imagen</span>
                         </div>
                         <span class="text-[10px] text-neutral-600">Midjourney / DALL-E</span>
                      </div>
                      <p 
                        (click)="togglePromptExpansion('img-' + $index)"
                        class="text-xs text-neutral-500 font-code leading-relaxed cursor-pointer transition-all duration-200 hover:text-neutral-300"
                        [class.line-clamp-2]="!isPromptExpanded('img-' + $index)">
                        {{item.imagePrompt}}
                      </p>
                      <button 
                        id="btn-prompt-img-{{$index}}"
                        (click)="copyToClipboard(item.imagePrompt, 'btn-prompt-img-' + $index)"
                        class="w-full mt-1 bg-indigo-900/10 border border-indigo-500/20 hover:bg-indigo-900/30 hover:border-indigo-500/40 text-indigo-300 text-xs font-semibold py-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        Copiar para Imagen
                      </button>
                   </div>

                   <!-- Video Prompt -->
                   <div class="bg-neutral-900/50 rounded-lg border border-neutral-800 p-3 flex flex-col gap-2 group/prompt">
                      <div class="flex items-center justify-between">
                         <div class="flex items-center gap-2 text-rose-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span class="text-xs font-bold tracking-wider uppercase">Prompt Video</span>
                         </div>
                         <span class="text-[10px] text-neutral-600">Runway / Pika</span>
                      </div>
                      <p 
                        (click)="togglePromptExpansion('vid-' + $index)"
                        class="text-xs text-neutral-500 font-code leading-relaxed cursor-pointer transition-all duration-200 hover:text-neutral-300"
                        [class.line-clamp-2]="!isPromptExpanded('vid-' + $index)">
                        {{item.videoPrompt}}
                      </p>
                       <button 
                        id="btn-prompt-vid-{{$index}}"
                        (click)="copyToClipboard(item.videoPrompt, 'btn-prompt-vid-' + $index)"
                        class="w-full mt-1 bg-rose-900/10 border border-rose-500/20 hover:bg-rose-900/30 hover:border-rose-500/40 text-rose-300 text-xs font-semibold py-2 rounded-md transition-colors flex items-center justify-center gap-2">
                        Copiar para Video
                      </button>
                   </div>
                </div>

              </div>

              <!-- Actions Footer -->
              <div class="p-4 bg-neutral-900 border-t border-neutral-800">
                <button
                  id="btn-copy-all-{{$index}}"
                  (click)="copyToClipboard(item.whatsappBody + '\n\n' + item.twitterBody + '\n\n' + item.hashtags, 'btn-copy-all-' + $index)"
                  class="w-full h-12 flex items-center justify-center gap-2.5 px-4 bg-neutral-800 border border-neutral-700 rounded-xl text-sm font-semibold text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all shadow-sm touch-manipulation active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copiar Todo (WhatsApp + X)</span>
                </button>
              </div>

            </article>
          }
        </div>
      </section>
    } @else if (!isLoading() && generatedNews().length === 0 && !isOverloaded()) {
      <div class="text-center py-24 px-4 animate-in fade-in zoom-in-95 duration-500" data-agent-id="idle-view">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-900 mb-6 ring-1 ring-neutral-800 shadow-2xl shadow-neutral-900">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-teal-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-white mb-3">Consola Lista</h3>
        <p class="text-base text-neutral-400 max-w-md mx-auto leading-relaxed">Pega el enlace de una noticia o escribe un tema para comenzar a escanear.</p>
      </div>
    }
  </main>
</div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  private geminiService = inject(GeminiService);

  // State
  isLoading = signal<boolean>(false);
  generatedNews = signal<NewsItem[]>([]);
  error = signal<string | null>(null);
  isOverloaded = signal<boolean>(false); // New state for 503 errors
  isCreditsDepleted = signal<boolean>(false); // New state for depleted credits
  expandedPrompts = signal<Set<string>>(new Set());
  customQuery = signal<string>('');

  // Agent State Computed Helpers
  agentOutputJson = computed(() => JSON.stringify(this.generatedNews(), null, 2));
  availableTopicsJson = computed(() => JSON.stringify(this.availableTopics));
  agentStateStr = computed(() => {
    if (this.isLoading()) return 'processing';
    if (this.isCreditsDepleted()) return 'credits_depleted';
    if (this.isOverloaded()) return 'overloaded';
    if (this.error()) return 'error';
    if (this.generatedNews().length > 0) return 'success';
    return 'idle';
  });

  ngOnInit() {
    // Check URL parameters for Agent automatic interaction
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('query');
      const topicsParam = params.get('topics');
      
      let shouldAutoRun = false;
      
      if (queryParam) {
        this.customQuery.set(decodeURIComponent(queryParam));
        shouldAutoRun = true;
      }
      
      if (topicsParam) {
        const decodedTopics = decodeURIComponent(topicsParam).split(',');
        const validTopics = this.availableTopics.filter(t => decodedTopics.includes(t));
        this.selectedTopics.set(new Set(validTopics));
        if (validTopics.length > 0) shouldAutoRun = true;
      }
      
      // Auto-trigger for AI agents running deep-links
      if (shouldAutoRun) {
        // slight delay to let UI render before fetching in browser
        setTimeout(() => this.generate(), 500);
      }
    }
  }

  // Computed State for URL Detection
  isUrl = computed(() => {
    const query = this.customQuery().trim();
    return /^(http|https):\/\/[^ "]+$/.test(query);
  });

  // Dynamic Button Text
  searchButtonText = computed(() => {
    if (this.isLoading()) return 'Procesando...';
    if (this.isUrl()) return 'Analizar Enlace';
    return 'Iniciar Búsqueda';
  });

  // Available Topics
  availableTopics = [
    'Última Hora',
    'China Tech',
    'Estados Unidos Tech',
    'Europa Tech',
    'Latinoamérica Tech',
    'Corea del Sur Tech',
    'Japón Tech',
    'Rusia Tech',
    'Taiwán Tech',
    'Singapur Tech',
    'África Tech',
    'Ciencia',
    'Tecnología',
    'Guerra',
    'Economía',
    'Aranceles',
    'Criptomonedas',
    'México',
    'Estados Unidos',
    'Trump',
    'China',
    'Rusia',
    'Corea del Norte',
    'Irán',
    'Corea del Sur',
    'Japón',
    'OTAN',
    'Europa',
    'Latinoamérica',
    'Narcotráfico',
    'Inteligencia Artificial',
    'Computación Cuántica',
    'Física Cuántica'
  ];

  selectedTopics = signal<Set<string>>(new Set());

  toggleTopic(topic: string) {
    const current = new Set(this.selectedTopics());
    if (current.has(topic)) {
      current.delete(topic);
    } else {
      current.add(topic);
    }
    this.selectedTopics.set(current);
  }

  isTopicSelected(topic: string): boolean {
    return this.selectedTopics().has(topic);
  }
  
  selectAllTopics() {
    this.selectedTopics.set(new Set(this.availableTopics));
  }

  clearAllTopics() {
    this.selectedTopics.set(new Set());
  }

  togglePromptExpansion(key: string) {
    this.expandedPrompts.update(current => {
      const newSet = new Set(current);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }

  isPromptExpanded(key: string): boolean {
    return this.expandedPrompts().has(key);
  }

  onCustomQueryInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.customQuery.set(target.value);
  }

  async generate() {
    const topics = Array.from(this.selectedTopics());
    const query = this.customQuery().trim();
    
    // Validation: Must have topics OR a query (URL or text)
    if (topics.length === 0 && !query) {
      this.error.set('Por favor selecciona un tema o pega un enlace.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.isOverloaded.set(false); // Reset overloaded state
    this.isCreditsDepleted.set(false); // Reset depleted credits state
    this.generatedNews.set([]);

    try {
      const news = await this.geminiService.generateNewsContent(topics, query);
      this.generatedNews.set(news);
    } catch (err: any) {
      console.error("Error detected:", err);
      const errorMessage = (err.message || JSON.stringify(err) || '').toLowerCase();
      
      // Check for specific depleted credits error message
      if (
        errorMessage.includes('prepayment') ||
        errorMessage.includes('depleted') ||
        errorMessage.includes('prepay') ||
        errorMessage.includes('billing')
      ) {
        this.isCreditsDepleted.set(true);
      } else if (
        errorMessage.includes('503') || 
        errorMessage.includes('429') || 
        errorMessage.includes('overloaded') || 
        errorMessage.includes('unavailable') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('resource_exhausted')
      ) {
        this.isOverloaded.set(true);
      } else {
        this.error.set(err.message || 'Ocurrió un error al generar las noticias. Intenta de nuevo.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById(id);
      if (btn) {
        const originalContent = btn.innerHTML;
        const originalClasses = btn.className;
        
        // Show success state
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-emerald-400">¡Copiado!</span>
        `;
        btn.className = `${originalClasses} bg-emerald-900/30 border-emerald-800`;
        
        setTimeout(() => {
           btn.innerHTML = originalContent;
           btn.className = originalClasses;
        }, 2000);
      }
    });
  }
}
