export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-tight mb-4">Essence</h3>
            <p className="text-gray-400 text-sm">
              Sua loja especializada nos melhores perfumes importados e de nicho.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Categorias</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Masculino</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Feminino</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Unissex</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Nicho</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Fale Conosco</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Trocas e Devoluções</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Prazos de Entrega</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Rastreie seu Pedido</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-4">
              Receba ofertas exclusivas.
            </p>
            <div className="flex">
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                className="w-full px-3 py-2 text-gray-900 rounded-l-md focus:outline-none"
              />
              <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-r-md transition-colors">
                Assinar
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2026 Essence. Todos os direitos reservados. Projeto Acadêmico.</p>
        </div>
      </div>
    </footer>
  );
}
