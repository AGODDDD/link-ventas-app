const fs = require('fs');

let content = fs.readFileSync('/Users/mark/link-ventas/components/tienda/templates/ModaTemplate.tsx', 'utf8');

// JSX Update
const oldJSX = `        {benefits.length > 0 && (
          <div className="detail-section" id="benefitsSection">
            <h2>Beneficios Exclusivos</h2>
            <div className="benefits-grid">
              {benefits.slice(0, 4).map((b: any, i: number) => (
                <div className="benefit-card animate-in" key={i}>
                  <div className="benefit-icon"><Check size={24} className="text-zinc-800"/></div>
                  <h3>{b.title}</h3>
                  <p>{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}`;

const newJSX = `        {benefits.length > 0 && (
          <div className="detail-section" id="benefitsSection">
            <h2>Beneficios Exclusivos</h2>
            <div className="benefits-grid" ref={benefitsRef}>
              {benefits.slice(0, 4).map((b: any, i: number) => (
                <div className="benefit-card" key={i}>
                  <div className="benefit-number">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{b.title}</h3>
                  <p>{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}`;

content = content.replace(oldJSX, newJSX);

// Add useEffect in DetailView
const oldDetailViewStart = `  // Dynamic blocks
  const benefits = Array.isArray(perfil.benefits) ? perfil.benefits : []`;

const newDetailViewStart = `  // Dynamic blocks
  const benefits = Array.isArray(perfil.benefits) ? perfil.benefits : []
  
  const benefitsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!benefitsRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const cards = benefitsRef.current.querySelectorAll('.benefit-card')
    cards.forEach((card, index) => {
      ;(card as HTMLElement).style.transitionDelay = \`\${index * 0.1}s\`
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [benefits])`;

content = content.replace(oldDetailViewStart, newDetailViewStart);

// CSS Update
const oldCSS = `.moda-urban-template .benefits-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
.moda-urban-template .benefit-card { text-align: center; padding: 1.5rem; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.moda-urban-template .benefit-icon { display: flex; justify-content: center; margin-bottom: 1rem; }
.moda-urban-template .benefit-card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
.moda-urban-template .benefit-card p { font-size: 0.85rem; color: var(--text-light); margin: 0; }`;

const newCSS = `.moda-urban-template .benefits-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 1.5rem; 
}
@media (max-width: 768px) {
  .moda-urban-template .benefits-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 380px) {
  .moda-urban-template .benefits-grid { grid-template-columns: 1fr; }
}

.moda-urban-template .benefit-card { 
  position: relative;
  text-align: left; 
  padding: 1.5rem; 
  background: #fff; 
  border: 1px solid #e8e8e8; 
  border-radius: 12px;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
}
.moda-urban-template .benefit-card.visible {
  opacity: 1;
  transform: translateY(0);
}
.moda-urban-template .benefit-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-4px);
}

.moda-urban-template .benefit-number { 
  font-size: 3rem; 
  font-weight: 800; 
  color: #e8e8e8; 
  margin-bottom: 0.5rem;
  line-height: 1;
}
.moda-urban-template .benefit-card h3 { 
  font-size: 0.95rem; 
  font-weight: 600; 
  color: #1a1a1a;
  margin-bottom: 0.5rem; 
}
.moda-urban-template .benefit-card p { 
  font-size: 0.85rem; 
  color: #666; 
  margin: 0; 
  line-height: 1.6;
}`;

content = content.replace(oldCSS, newCSS);

fs.writeFileSync('/Users/mark/link-ventas/components/tienda/templates/ModaTemplate.tsx', content);
