import React from 'react';
import Image from "next/image";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip, Legend
} from 'recharts';


interface PieChartData {
    name: string;
    value: number;
    color: string;
}

interface PieChartCardProps {
    title: string;
    icon: string;
    data: PieChartData[];
}

const PieChartCard: React.FC<PieChartCardProps> = ({ title, icon, data }) => {
    return (
        <div className="d-flex flex-column bg-white p-4 p-lg-4 h-100 statCard">
            <div className="d-flex flex-row align-items-center mb-4" style={{ alignItems: "center" }}>
                <div className="me-3" style={{
                    background: "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)",
                    padding: "10px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <Image src={icon} alt="icon" width={24} height={24} />
                </div>
                <h5 className="mb-0" style={{ color: '#111827', fontSize: "18px", fontWeight: 600 }}>{title}</h5>
            </div>

            <div style={{ width: '100%', height: '450px', marginTop: '-50px' }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Tooltip
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                        />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            // innerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            stroke="white"
                            strokeWidth={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>

                        <Legend
                            verticalAlign="bottom"
                            layout="horizontal"
                            align="center"
                            iconSize={10}
                            wrapperStyle={{ paddingBottom: '10px' }}
                            className="" style={{ marginTop: "-10px" }}
                        />

                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2">
                {data.map((item) => (
                    <div key={item.name} className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center">
                            <span
                                className="d-inline-block me-2"
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: item.color,
                                    borderRadius: '50%',
                                }}
                            ></span>
                            <span className="text-muted">{item.name}</span>
                        </div>
                        <span className="fw-bold">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChartCard;