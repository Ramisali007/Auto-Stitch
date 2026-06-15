import { useEffect } from 'react';
import { BarChart2, TrendingUp, DollarSign, Eye, Package, ShoppingBag, ArrowUp, ArrowDown, Users } from 'lucide-react';
import './BoutiqueManage.css';

const STATS = [
  { label: 'Total Revenue', value: 'PKR 245K', trend: '+18%', up: true, icon: <DollarSign size={20} /> },
  { label: 'Total Orders', value: '156', trend: '+12%', up: true, icon: <ShoppingBag size={20} /> },
  { label: 'Product Views', value: '8,432', trend: '+24%', up: true, icon: <Eye size={20} /> },
  { label: 'Conversion Rate', value: '3.2%', trend: '-0.5%', up: false, icon: <TrendingUp size={20} /> },
];

const TOP_PRODUCTS = [
  { name: 'Embroidered Lawn Suit', sold: 67, revenue: 'PKR 368K', trend: '+15%' },
  { name: 'Cotton Casual Kurta', sold: 54, revenue: 'PKR 189K', trend: '+8%' },
  { name: 'Chiffon Party Dress', sold: 31, revenue: 'PKR 372K', trend: '+22%' },
  { name: 'Net Gharara Set', sold: 12, revenue: 'PKR 264K', trend: '+5%' },
];

const MONTHLY_DATA = [
  { month: 'Nov', value: 35 }, { month: 'Dec', value: 52 }, { month: 'Jan', value: 41 },
  { month: 'Feb', value: 68 }, { month: 'Mar', value: 85 }, { month: 'Apr', value: 92 },
];

export default function Analytics() {
  useEffect(() => { document.title = 'Analytics — Boutique Dashboard'; }, []);
  const maxVal = Math.max(...MONTHLY_DATA.map(d => d.value));

  return (
    <div className="manage-page page-enter">
      <div className="container">
        <div className="manage-header"><div><h1>Boutique <span className="text-gradient">Analytics</span></h1><p className="text-muted">Track your boutique's performance and growth</p></div></div>

        <div className="analytics-stats">
          {STATS.map(s => (
            <div key={s.label} className="analytics-card glass-card">
              <div className="ac-icon-wrap">{s.icon}</div>
              <p className="ac-value">{s.value}</p>
              <p className="ac-label text-muted">{s.label}</p>
              <p className={`ac-trend ${s.up ? 'text-success' : 'text-error'}`}>
                {s.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {s.trend}
              </p>
            </div>
          ))}
        </div>

        <div className="analytics-grid">
          {/* Chart */}
          <div className="chart-section glass-card">
            <h3><BarChart2 size={18} /> Monthly Orders</h3>
            <div className="bar-chart">
              {MONTHLY_DATA.map(d => (
                <div key={d.month} className="bar-col">
                  <div className="bar" style={{ height: `${(d.value / maxVal) * 100}%` }}>
                    <span className="bar-value">{d.value}</span>
                  </div>
                  <span className="bar-label">{d.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="top-products-section glass-card">
            <h3><Package size={18} /> Top Products</h3>
            <div className="top-list">
              {TOP_PRODUCTS.map((p, i) => (
                <div key={p.name} className="top-item">
                  <span className="top-rank">#{i + 1}</span>
                  <div className="top-info">
                    <p className="fw-500">{p.name}</p>
                    <p className="text-muted text-xs">{p.sold} sold · {p.revenue}</p>
                  </div>
                  <span className="text-success text-xs">{p.trend}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
