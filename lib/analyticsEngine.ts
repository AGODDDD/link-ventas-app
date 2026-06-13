export type InsightType = 'success' | 'warning' | 'info' | 'prediction' | 'danger';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  metric?: string;
}

export function generateInsights(
  orders: any[],
  leads: any[],
  carts: any[],
  currentDate: Date = new Date()
): Insight[] {
  const insights: Insight[] = [];

  // Helper functions
  const isSameMonth = (d1: Date, d2: Date) => d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  // 1. Proyección de Cierre de Mes (Prediction)
  const currentMonthOrders = orders.filter(o => isSameMonth(new Date(o.created_at), currentDate));
  const currentMonthTotal = currentMonthOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || o.total || '0'), 0);
  
  const currentDay = Math.max(1, currentDate.getDate());
  const daysInMonth = getDaysInMonth(currentDate);
  const projectedTotal = (currentMonthTotal / currentDay) * daysInMonth;

  if (projectedTotal > 0) {
    insights.push({
      id: 'monthly-projection',
      type: 'prediction',
      title: 'Proyección de Cierre',
      message: `A este ritmo de ventas, proyectamos que cerrarás el mes con mayores ingresos. Manten el esfuerzo.`,
      metric: `S/ ${projectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    });
  }

  // 2. Alerta de Caída de Conversión (Warning)
  const last7Days = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previous7Days = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const ordersL7 = orders.filter(o => new Date(o.created_at) >= last7Days);
  const leadsL7 = leads.filter(l => new Date(l.created_at) >= last7Days);
  
  const ordersP7 = orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= previous7Days && d < last7Days;
  });
  const leadsP7 = leads.filter(l => {
    const d = new Date(l.created_at);
    return d >= previous7Days && d < last7Days;
  });

  const convL7 = leadsL7.length > 0 ? ordersL7.length / leadsL7.length : 0;
  const convP7 = leadsP7.length > 0 ? ordersP7.length / leadsP7.length : 0;

  if (convP7 > 0 && convL7 < convP7 * 0.8) { // Dropped more than 20%
    const dropPercent = Math.round((1 - (convL7 / convP7)) * 100);
    insights.push({
      id: 'conversion-drop',
      type: 'warning',
      title: 'Caída de Conversión',
      message: `Tu conversión bajó un ${dropPercent}% comparado a la semana anterior. Revisa si tus precios son competitivos o mejora tu atención.`,
      metric: `${Math.round(convL7 * 100)}%`
    });
  } else if (convP7 > 0 && convL7 > convP7 * 1.2) {
    insights.push({
      id: 'conversion-up',
      type: 'success',
      title: 'Conversión en Alza',
      message: 'Tu tasa de conversión ha mejorado significativamente respecto a la semana pasada. ¡Excelente trabajo!',
      metric: `${Math.round(convL7 * 100)}%`
    });
  } else if (leads.length > 0) {
    insights.push({
      id: 'conversion-stable',
      type: 'success',
      title: 'Conversión Saludable',
      message: 'Tu tasa de conversión se mantiene estable y dentro de los rangos normales respecto a la semana pasada.',
      metric: `${Math.round(convL7 * 100)}%`
    });
  }

  // 3. Recomendación de Horario Pico (Info)
  if (orders.length > 10) {
    const hourCounts = new Array(24).fill(0);
    orders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      hourCounts[hour]++;
    });

    let bestWindowStart = 0;
    let maxOrdersInWindow = 0;

    for (let i = 0; i < 22; i++) {
      const windowSum = hourCounts[i] + hourCounts[i + 1] + hourCounts[i + 2];
      if (windowSum > maxOrdersInWindow) {
        maxOrdersInWindow = windowSum;
        bestWindowStart = i;
      }
    }

    const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;
    const percentage = Math.round((maxOrdersInWindow / orders.length) * 100);

    if (percentage > 15) {
      insights.push({
        id: 'peak-hours',
        type: 'info',
        title: 'Horario Pico Identificado',
        message: `El ${percentage}% de tus ventas ocurren entre las ${formatHour(bestWindowStart)} y ${formatHour(bestWindowStart + 3)}. Programa tus anuncios en esa ventana.`,
        metric: `${formatHour(bestWindowStart)} - ${formatHour(bestWindowStart + 3)}`
      });
    }
  }

  // 4. Rescate de Capital (Danger)
  const twoDaysAgo = new Date(currentDate.getTime() - 48 * 60 * 60 * 1000);
  const recentAbandonedCarts = carts.filter(c => new Date(c.created_at) >= twoDaysAgo && !c.recovered);

  if (recentAbandonedCarts.length > 0) {
    const lostCapital = recentAbandonedCarts.reduce((acc, c) => {
      const items = typeof c.cart_items === 'string' ? JSON.parse(c.cart_items) : (c.cart_items || []);
      const cartTotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price || item.unitPrice || '0') * (item.quantity || 1)), 0);
      return acc + cartTotal;
    }, 0);

    if (lostCapital > 0) {
      insights.push({
        id: 'abandoned-carts',
        type: 'danger',
        title: 'Capital Estancado',
        message: `Tienes ${recentAbandonedCarts.length} carritos abandonados recientes. Envía un mensaje manual con un descuento para rescatarlos hoy.`,
        metric: `S/ ${lostCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      });
    } else {
      insights.push({
        id: 'no-abandoned-carts',
        type: 'success',
        title: 'Cero Fugas',
        message: `Excelente. No tienes carritos abandonados sin recuperar en las últimas 48 horas. Tu flujo de pago es eficiente.`,
        metric: `S/ 0.00`
      });
    }
  } else if (orders.length > 0) {
    insights.push({
      id: 'no-abandoned-carts',
      type: 'success',
      title: 'Cero Fugas de Capital',
      message: `No hemos detectado carritos abandonados en las últimas 48 horas. Todos los intentos de compra fueron exitosos.`,
      metric: `S/ 0.00`
    });
  }

  // 5. Producto Estrella en Riesgo (Danger/Warning)
  if (orders.length > 20) {
    const productStats = new Map<string, { totalSold: number, last7DaysSold: number }>();
    
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const isL7 = d >= last7Days;
      
      if (o.order_items) {
        o.order_items.forEach((item: any) => {
          const stats = productStats.get(item.name) || { totalSold: 0, last7DaysSold: 0 };
          stats.totalSold += item.quantity;
          if (isL7) stats.last7DaysSold += item.quantity;
          productStats.set(item.name, stats);
        });
      }
    });

    const products = Array.from(productStats.entries()).map(([name, stats]) => ({ name, ...stats }));
    // Sort by total sold to find "stars"
    products.sort((a, b) => b.totalSold - a.totalSold);
    
    const topProducts = products.slice(0, 3);
    
    // Total days store has been active
    const oldestOrderDate = orders.length > 0 ? new Date(Math.min(...orders.map(o => new Date(o.created_at).getTime()))) : currentDate;
    const storeDaysActive = Math.max(7, Math.ceil((currentDate.getTime() - oldestOrderDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let riskFound = false;
    for (const prod of topProducts) {
      if (prod.totalSold > 5) {
        const historicalDailyAvg = prod.totalSold / storeDaysActive;
        const l7DailyAvg = prod.last7DaysSold / 7;
        
        // If last 7 days average is less than 50% of historical average
        if (l7DailyAvg < historicalDailyAvg * 0.5) {
          insights.push({
            id: `product-risk-${prod.name}`,
            type: 'danger',
            title: 'Producto Estrella en Riesgo',
            message: `Tu top ventas "${prod.name}" ha caído drásticamente esta semana. ¿Problemas de stock o precios? Considera promocionarlo.`,
            metric: prod.name
          });
          riskFound = true;
          break; // Show only one product warning to avoid spamming
        }
      }
    }

    if (!riskFound) {
       insights.push({
         id: 'products-healthy',
         type: 'success',
         title: 'Catálogo Fuerte',
         message: `Tus productos estrella mantienen un ritmo de ventas constante y saludable. No hay caídas inusuales detectadas.`,
         metric: 'Estable'
       });
    }
  }

  // Return max 4 insights to keep UI clean, sorted by severity/importance
  const severityOrder = { danger: 0, warning: 1, prediction: 2, success: 3, info: 4 };
  return insights.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]).slice(0, 4);
}
