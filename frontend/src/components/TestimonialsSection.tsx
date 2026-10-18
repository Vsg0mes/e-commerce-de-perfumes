import { Star, Quote, Sparkles } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  initials: string;
  rating: number;
  comment: string;
}

export function TestimonialsSection() {
  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Heli',
      role: 'Cliente Verificada',
      initials: 'H',
      rating: 5,
      comment:
        'A fixação é simplesmente maravilhosa, durou o dia inteiro na minha pele! O cheiro é perfeito e tem uma evolução linda. Fiquei encantada com a qualidade e já virou meu queridinho de todos os dias.',
    },
    {
      id: '2',
      name: 'Eduardo',
      role: 'Cliente Verificado',
      initials: 'E',
      rating: 5,
      comment:
        'Fui elogiado logo no primeiro dia de uso! O perfume tem um cheiro incrível, projeta muito bem sem ser enjoativo. Várias pessoas no trabalho vieram me perguntar qual fragrância eu estava usando.',
    },
    {
      id: '3',
      name: 'Thais',
      role: 'Cliente Verificada',
      initials: 'T',
      rating: 5,
      comment:
        'Já é o meu terceiro pedido e a qualidade se mantém impecável em todos os frascos! A similaridade é impressionante e a fixação não deixa nada a desejar. Entrega rápida e produto de altíssimo nível.',
    },
  ];

  return (
    <section id="depoimentos" className="py-24 bg-[#0a0a0c] border-t border-[#1a1a1e] relative select-none">
      {/* Subtle top divider line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 max-w-md h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#121214]/60 backdrop-blur-md mb-4">
            <Sparkles size={12} className="text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-cinzel text-[#D4AF37] font-semibold">
              Reconhecimento & Avaliações
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight mb-4">
            Experiências <span className="italic text-gold-gradient font-normal">Memoráveis</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
            A percepção real de quem já usa e comprova a fixação e presença das nossas fragrâncias.
          </p>
        </div>

        {/* 3 Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="group relative p-8 rounded-2xl bg-[#121214] border border-[#222226] hover:border-[#D4AF37]/45 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between"
            >
              {/* Quote Icon Header */}
              <div className="flex items-center justify-between mb-6">
                {/* 5 Golden Stars */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className="fill-[#D4AF37] text-[#D4AF37] drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]"
                    />
                  ))}
                </div>
                <Quote size={20} className="text-[#D4AF37]/40 group-hover:text-[#D4AF37]/80 transition-colors" />
              </div>

              {/* Review Comment */}
              <p className="font-serif italic text-sm sm:text-base text-gray-300 leading-relaxed font-light mb-8">
                “{t.comment}”
              </p>

              {/* Author Info */}
              <div className="pt-4 border-t border-[#1e1e22] flex items-center gap-3.5">
                {/* Monogram Initials Circle */}
                <div className="w-10 h-10 rounded-full border border-[#D4AF37]/40 bg-[#1c1c20] flex items-center justify-center font-cinzel text-xs font-semibold text-[#D4AF37] group-hover:scale-105 transition-transform">
                  {t.initials}
                </div>
                <div className="flex flex-col">
                  <span className="font-cinzel text-xs font-semibold tracking-wider text-white">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-sans">
                    {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
