import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = {
  pending: '#fbbf24',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#f97316',
};

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const OrderStatusPieChart = ({ data = [] }) => {
  const statusData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      color: COLORS[item.status] || '#6b7280',
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = statusData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{data.value}</span> orders ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    if (percent < 0.02) return null;

    return (
      <g>
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke="#94a3b8"
          fill="none"
        />
        <circle cx={ex} cy={ey} r={2} fill="#94a3b8" stroke="none" />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 5}
          y={ey}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill="#475569"
          style={{ fontSize: '11px', fontWeight: 600 }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200"
    >
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800">Order Status</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Distribution of order statuses</p>
      </div>
      <ResponsiveContainer width="100%" height={250} minHeight={200}>
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={70}
            innerRadius={50}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry) => (
              <span style={{ color: entry.color, fontSize: '12px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default OrderStatusPieChart;

