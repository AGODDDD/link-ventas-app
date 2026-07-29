const fs = require('fs');

let content = fs.readFileSync('/Users/mark/link-ventas/app/dashboard/configuracion/page.tsx', 'utf8');

content = content.replace(
  "CheckCircle2, AlertTriangle, X } from 'lucide-react'",
  "CheckCircle2, AlertTriangle, X, LayoutList, Trash2, Plus } from 'lucide-react'"
);

content = content.replace(
  "whatsappPhone: string;",
  `whatsappPhone: string;
  benefits: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  promoTitle: string;
  promoDescription: string;`
);

content = content.replace(
  "whatsappPhone: data.whatsapp_phone || '',",
  `whatsappPhone: data.whatsapp_phone || '',
          benefits: data.benefits || [],
          faqs: data.faqs || [],
          promoTitle: data.promo_title || '',
          promoDescription: data.promo_description || '',`
);

content = content.replace(
  "whatsapp_phone: formData.whatsappPhone.replace(/\\s/g, '') || null,",
  `whatsapp_phone: formData.whatsappPhone.replace(/\\s/g, '') || null,
          benefits: formData.benefits,
          faqs: formData.faqs,
          promo_title: formData.promoTitle,
          promo_description: formData.promoDescription,`
);

content = content.replace(
  "{ id: 'marketing', label: 'Marketing & Redes', icon: Share2 },",
  `{ id: 'marketing', label: 'Marketing & Redes', icon: Share2 },
  { id: 'contenido', label: 'Contenido de Tienda', icon: LayoutList },`
);

const contenidoBlock = `
          {/* 7. CONTENIDO DE TIENDA */}
          {activeTab === 'contenido' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Sección Promocional</CardTitle>
                  <CardDescription>Destaca ofertas o mensajes clave en tu tienda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Título promocional</Label>
                    <Input 
                      placeholder="Ej: Envíos gratis este fin de semana" 
                      value={formData.promoTitle} 
                      onChange={(e) => updateForm('promoTitle', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción promocional</Label>
                    <textarea 
                      className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none min-h-[80px]"
                      placeholder="Ej: Aplica para compras mayores a S/150 a nivel nacional." 
                      value={formData.promoDescription} 
                      onChange={(e) => updateForm('promoDescription', e.target.value)} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Beneficios Exclusivos</CardTitle>
                    <CardDescription>Agrega hasta 4 razones para comprar en tu tienda.</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={formData.benefits.length >= 4}
                    onClick={() => updateForm('benefits', [...formData.benefits, { title: '', description: '' }])}
                    className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800"
                  >
                    <Plus size={16} /> Agregar Beneficio
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {formData.benefits.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Aún no has agregado beneficios.
                    </div>
                  ) : (
                    formData.benefits.map((benefit, i) => (
                      <div key={i} className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            const newBenefits = [...formData.benefits];
                            newBenefits.splice(i, 1);
                            updateForm('benefits', newBenefits);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                        <div className="space-y-2 pr-8">
                          <Label>Título</Label>
                          <Input 
                            value={benefit.title} 
                            placeholder="Ej: Calidad Premium"
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[i].title = e.target.value;
                              updateForm('benefits', newBenefits);
                            }} 
                          />
                        </div>
                        <div className="space-y-2 pr-8">
                          <Label>Descripción</Label>
                          <Input 
                            value={benefit.description} 
                            placeholder="Ej: Materiales importados de alta durabilidad."
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[i].description = e.target.value;
                              updateForm('benefits', newBenefits);
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Preguntas Frecuentes (FAQ)</CardTitle>
                    <CardDescription>Resuelve dudas comunes de tus clientes (máximo 6).</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={formData.faqs.length >= 6}
                    onClick={() => updateForm('faqs', [...formData.faqs, { question: '', answer: '' }])}
                    className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800"
                  >
                    <Plus size={16} /> Agregar Pregunta
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {formData.faqs.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Aún no has agregado preguntas frecuentes.
                    </div>
                  ) : (
                    formData.faqs.map((faq, i) => (
                      <div key={i} className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            const newFaqs = [...formData.faqs];
                            newFaqs.splice(i, 1);
                            updateForm('faqs', newFaqs);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                        <div className="space-y-2 pr-8">
                          <Label>Pregunta</Label>
                          <Input 
                            value={faq.question} 
                            placeholder="Ej: ¿Hacen envíos a provincia?"
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[i].question = e.target.value;
                              updateForm('faqs', newFaqs);
                            }} 
                          />
                        </div>
                        <div className="space-y-2 pr-8">
                          <Label>Respuesta</Label>
                          <textarea 
                            className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none min-h-[80px]"
                            value={faq.answer} 
                            placeholder="Ej: Sí, enviamos por Olva Courier a todo el Perú."
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[i].answer = e.target.value;
                              updateForm('faqs', newFaqs);
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            </div>
          )}
`;

content = content.replace(
  "        </div>\n      </div>\n\n      {/* STICKY SAVE BAR */}",
  contenidoBlock + "\n        </div>\n      </div>\n\n      {/* STICKY SAVE BAR */}"
);

fs.writeFileSync('/Users/mark/link-ventas/app/dashboard/configuracion/page.tsx', content);
