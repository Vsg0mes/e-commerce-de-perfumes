import { Instagram, Facebook, MessageCircle, Mail, ArrowUp } from 'lucide-react';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050505] text-gray-300 border-t border-[#1f1f23] transition-colors relative">
      {/* Subtle gold top line glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
          
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex flex-col">
              <span className="font-cinzel text-2xl font-bold tracking-[0.25em] text-white">
                MEMORARE
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
              Criando fragrâncias marcantes e inesquecíveis para pessoas que deixam sua marca por onde passam. Alta fixação, intensidade e fidelidade olfativa.
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center space-x-3 pt-2">
              <a 
                href="#instagram" 
                aria-label="Instagram"
                className="w-9 h-9 rounded-full border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300"
              >
                <Instagram size={16} />
              </a>
              <a 
                href="#facebook" 
                aria-label="Facebook"
                className="w-9 h-9 rounded-full border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300"
              >
                <Facebook size={16} />
              </a>
              <a 
                href="#whatsapp" 
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300"
              >
                <MessageCircle size={16} />
              </a>
              <a 
                href="mailto:contato@memorare.com" 
                aria-label="E-mail"
                className="w-9 h-9 rounded-full border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all duration-300"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Links: Coleção */}
          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-5">
              Coleções
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><a href="/?gender=Masculino" className="hover:text-white transition-colors">Fragrâncias Masculinas</a></li>
              <li><a href="/?gender=Feminino" className="hover:text-white transition-colors">Fragrâncias Femininas</a></li>
              <li><a href="/?gender=Unissex" className="hover:text-white transition-colors">Linha Unissex</a></li>
              <li><a href="#colecao" className="hover:text-white transition-colors">Destaques da Coleção</a></li>
            </ul>
          </div>

          {/* Links: Atendimento */}
          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-5">
              Atendimento
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><a href="#diferenciais" className="hover:text-white transition-colors">Garantia de Qualidade</a></li>
              <li><a href="#diferenciais" className="hover:text-white transition-colors">Prazos e Entregas Seguras</a></li>
              <li><a href="#essencia" className="hover:text-white transition-colors">Nossa Essência</a></li>
              <li><a href="mailto:atendimento@memorare.com" className="hover:text-white transition-colors">Fale com um Especialista</a></li>
            </ul>
          </div>

          {/* Contact / Newsletter Column */}
          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#D4AF37] font-semibold mb-5">
              Novidades Memorare
            </h4>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">
              Receba com exclusividade lançamentos de novas fragrâncias e promoções.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Seu endereço de e-mail" 
                  className="w-full px-3.5 py-2.5 text-xs bg-[#121214] text-white border border-[#27272a] rounded-lg focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 placeholder-gray-500 transition-colors"
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2.5 px-4 text-xs font-medium tracking-wider uppercase bg-[#18181b] hover:bg-[#D4AF37] hover:text-[#080808] text-gray-200 border border-[#27272a] hover:border-[#D4AF37] rounded-lg transition-all duration-300"
              >
                Cadastrar
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1a1a1c] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p className="tracking-wide">
            &copy; 2026 MEMORARE. Todos os direitos reservados.
          </p>
          
          <button 
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#D4AF37] transition-colors uppercase tracking-widest"
          >
            <span>Voltar ao topo</span>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
