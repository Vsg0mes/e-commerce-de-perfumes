import { Sparkles, Feather, Compass, Gem } from 'lucide-react';

export function NossaEssencia() {
  return (
    <section id="essencia" className="relative py-24 sm:py-32 bg-[#080808] overflow-hidden text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-[#997B20]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#121214]/60 backdrop-blur-md mb-4">
            <Sparkles size={12} className="text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-cinzel text-[#D4AF37] font-semibold">
              Filosofia & Qualidade
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white mb-6">
            Nossa <span className="italic text-gold-gradient font-normal">Essência</span>
          </h2>

          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto mb-8" />

          {/* User mandatory exact text */}
          <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl text-gray-200 italic font-light leading-relaxed">
            “A Memorare nasceu para transformar fragrâncias em experiências memoráveis. Cada perfume é desenvolvido para transmitir personalidade, sofisticação e exclusividade.”
          </blockquote>
        </div>

        {/* Brand Pillars & Sculptural Composition Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left: Monogram / Visual Composition */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-72 sm:w-80 h-96 rounded-3xl bg-gradient-to-b from-[#141418] via-[#0e0e10] to-[#080808] border border-[#27272a] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between p-8 overflow-hidden group">
              
              {/* Subtle gold grid sheen */}
              <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
              
              {/* Top Accent */}
              <div className="w-full flex justify-between items-center z-10">
                <span className="font-cinzel text-[10px] tracking-[0.3em] text-[#D4AF37] uppercase">EST. 2026</span>
                <span className="text-[9px] uppercase tracking-widest text-gray-400">PERFUMES EXCLUSIVOS</span>
              </div>

              {/* Center Crest Emblem */}
              <div className="relative z-10 flex flex-col items-center justify-center py-6">
                <div className="w-24 h-24 rounded-full border border-[#D4AF37]/40 flex items-center justify-center relative shadow-[0_0_25px_rgba(212,175,55,0.15)] group-hover:scale-105 transition-transform duration-700">
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#D4AF37]/30" />
                  <span className="font-cinzel text-4xl font-bold tracking-wider text-gold-gradient">
                    M
                  </span>
                </div>
                <span className="font-cinzel text-xs tracking-[0.4em] uppercase text-white font-semibold mt-4">
                  MEMORARE
                </span>
                <span className="text-[9px] tracking-[0.25em] uppercase text-[#D4AF37] font-sans mt-0.5">
                  A ARTE DA FRAGRÂNCIA
                </span>
              </div>

              {/* Bottom Note */}
              <div className="relative z-10 w-full pt-4 border-t border-[#1f1f23] text-center">
                <p className="text-[11px] text-gray-400 font-serif italic">
                  "Um aroma é a forma mais intensa da memória."
                </p>
              </div>

              {/* Corner Glow Accent */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none" />
            </div>
          </div>

          {/* Right: The 3 Core Pillars */}
          <div className="lg:col-span-7 space-y-8">
            <div className="group p-6 rounded-2xl bg-[#101012] border border-[#222226] hover:border-[#D4AF37]/40 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#2a2a30] text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Gem size={18} />
                </div>
                <div>
                  <h3 className="font-cinzel text-base tracking-wider uppercase text-white font-medium mb-1.5 group-hover:text-[#F3E5AB] transition-colors">
                    Alta Concentração de Essência
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-light">
                    Nossas fragrâncias utilizam matérias-primas e óleos essenciais de altíssimo padrão, garantindo notas ricas, profundidade e evolução olfativa surpreendente.
                  </p>
                </div>
              </div>
            </div>

            <div className="group p-6 rounded-2xl bg-[#101012] border border-[#222226] hover:border-[#D4AF37]/40 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#2a2a30] text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Feather size={18} />
                </div>
                <div>
                  <h3 className="font-cinzel text-base tracking-wider uppercase text-white font-medium mb-1.5 group-hover:text-[#F3E5AB] transition-colors">
                    Fixação & Projeção Marcante
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-light">
                    Mais do que um perfume, uma assinatura que permanece na pele. Fragrâncias com durabilidade notável e rastro envolvente que desperta elogios espontâneos.
                  </p>
                </div>
              </div>
            </div>

            <div className="group p-6 rounded-2xl bg-[#101012] border border-[#222226] hover:border-[#D4AF37]/40 transition-all duration-300 hover:translate-x-1">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#18181c] border border-[#2a2a30] text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="font-cinzel text-base tracking-wider uppercase text-white font-medium mb-1.5 group-hover:text-[#F3E5AB] transition-colors">
                    Inspiração com Máxima Fidelidade
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-light">
                    As fragrâncias mais desejadas do mundo com acabamento impecável e extrema similaridade, entregando uma experiência de alto padrão com excelente custo-benefício.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
