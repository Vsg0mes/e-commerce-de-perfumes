import { Award, Sparkles, Truck, Clock } from 'lucide-react';

export function DifferentialsBar() {
  const differentials = [
    {
      icon: Sparkles,
      title: 'Alta Fixação & Projeção',
      description: 'Fórmula concentrada com essências de excelência para longa duração na pele.',
    },
    {
      icon: Award,
      title: 'Fidelidade Olfativa',
      description: 'Fragrâncias inspiradas nas maiores referências mundiais com máxima similaridade.',
    },
    {
      icon: Truck,
      title: 'Entrega para Todo o Brasil',
      description: 'Envio rápido, seguro e com embalagem reforçada para proteção do frasco.',
    },
    {
      icon: Clock,
      title: 'Atendimento Premium',
      description: 'Assessoria personalizada para ajudar você a escolher sua fragrância favorita.',
    },
  ];

  return (
    <section id="diferenciais" className="relative bg-[#0b0b0d] border-y border-[#1f1f23] py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle gold line accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 max-w-lg h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {differentials.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-[#121214]/60 border border-[#222226] hover:border-[#D4AF37]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex flex-col items-center sm:items-start text-center sm:text-left"
              >
                {/* Icon Container with gold ring */}
                <div className="w-12 h-12 rounded-xl bg-[#18181c] border border-[#2c2c32] group-hover:border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] mb-4 transition-colors duration-300 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                  <Icon size={22} className="group-hover:scale-110 transition-transform duration-300" />
                </div>

                {/* Title */}
                <h3 className="font-cinzel text-sm uppercase tracking-wider text-white font-medium mb-1.5 group-hover:text-[#F3E5AB] transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
