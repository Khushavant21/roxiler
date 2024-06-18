import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PieChart = ({ month }) => {
    const [pieChartData, setPieChartData] = useState([]);

    useEffect(() => {
        fetchPieChartData();
    }, [month]);

    const fetchPieChartData = async () => {
        const response = await axios.get('/api/pie-chart', { params: { month } });
        setPieChartData(response.data);
    };

    return (
        <div>
            <h3>Pie Chart</h3>
            <ul>
                {pieChartData.map((data) => (
                    <li key={data._id}>{data._id}: {data.count}</li>
                ))}
            </ul>
        </div>
    );
};

export default PieChart;
