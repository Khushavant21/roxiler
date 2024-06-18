import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BarChart = ({ month }) => {
    const [barChartData, setBarChartData] = useState([]);

    useEffect(() => {
        fetchBarChartData();
    }, [month]);

    const fetchBarChartData = async () => {
        const response = await axios.get('/api/bar-chart', { params: { month } });
        setBarChartData(response.data);
    };

    return (
        <div>
            <h3>Bar Chart</h3>
            <ul>
                {barChartData.map((data) => (
                    <li key={data.range}>{data.range}: {data.count}</li>
                ))}
            </ul>
        </div>
    );
};

export default BarChart;
