import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function DannigLayout({ children }: LayoutProps) {
  return (
    <div className="page">
      {/* Topbar */}
      <div className="topbar" role="region" aria-label="Barra de contacto">
        <div className="topbar__inner">
          <span className="badge">Agenda</span>
          <span>+56 9 3260 9541</span> • <span>+56 9 4055 9027</span>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header__inner">
          <div className="brand" aria-label="Dannig Óptica">
            <img 
              src="https://dannig.cl/wp-content/uploads/2025/02/Logo-dannig.png" 
              alt="Dannig Óptica" 
            />
            <div className="brand__name">DANNIG ÓPTICA</div>
          </div>
          <a 
            className="cta" 
            href="https://wa.me/56932609541" 
            target="_blank" 
            rel="noopener"
          >
            Agenda por WhatsApp
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '2rem 1rem'
      }}>
        {children}
      </main>

      {/* Footer */}
      <footer>
        <div className="footer__inner">
          <div>Av. Pajaritos #3195, piso 13 oficina 1318, Maipú</div>
          <div>© 2025 Dannig Óptica</div>
        </div>
      </footer>
    </div>
  );
}
