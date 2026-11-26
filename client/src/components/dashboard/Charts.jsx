import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Cell, PieChart, Pie } from 'recharts';

const axis = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false };
const tip = {
  contentStyle: { background: '#16181b', border: '1px solid #2b2f35', borderRadius: 12, fontSize: 12, color: '#e4e4e7' },
  cursor: { fill: 'rgba(255,255,255,.04)' },
};
const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
const short = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function WeeklyBar({ data, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} stroke="#1f2226" />
        <XAxis dataKey="date" tickFormatter={day} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tip} labelFormatter={short} formatter={(v) => [v, 'Completed']} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#barGrad)" maxBarSize={36} />
        <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f6fb0" /><stop offset="100%" stopColor="#7fb0e6" /></linearGradient></defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityArea({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f6fb0" stopOpacity={0.5} /><stop offset="100%" stopColor="#2f6fb0" stopOpacity={0} /></linearGradient>
          <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7fb0e6" stopOpacity={0.4} /><stop offset="100%" stopColor="#7fb0e6" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#1f2226" />
        <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={24} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tip} labelFormatter={short} />
        <Area type="monotone" dataKey="completions" name="Completions" stroke="#2f6fb0" fill="url(#a1)" strokeWidth={2} />
        <Area type="monotone" dataKey="activeStudents" name="Active students" stroke="#7fb0e6" fill="url(#a2)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({ data, dataKey = 'count', height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -24, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="#1f2226" />
        <XAxis dataKey="date" tickFormatter={short} {...axis} minTickGap={24} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tip} labelFormatter={short} />
        <Line type="monotone" dataKey={dataKey} stroke="#7fb0e6" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const diffColors = { Easy: '#34d399', Medium: '#fbbf24', Hard: '#fb7185' };
export function DifficultyPie({ data, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="difficulty" innerRadius={50} outerRadius={78} paddingAngle={3} stroke="none">
          {data.map((d) => <Cell key={d.difficulty} fill={diffColors[d.difficulty] || '#2f6fb0'} />)}
        </Pie>
        <Tooltip {...tip} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HBar({ data, labelKey, valueKey = 'count', height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 12 }}>
        <CartesianGrid horizontal={false} stroke="#1f2226" />
        <XAxis type="number" allowDecimals={false} {...axis} />
        <YAxis type="category" dataKey={labelKey} width={120} {...axis} />
        <Tooltip {...tip} />
        <Bar dataKey={valueKey} fill="#2f6fb0" radius={[0, 6, 6, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
