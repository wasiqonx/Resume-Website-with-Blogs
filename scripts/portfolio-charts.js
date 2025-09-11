// Portfolio Charts using Chart.js
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('portfolioChart');
    const ctx = canvas.getContext('2d');
    
    // Portfolio data (renamed assets)
    const portfolioData = [
        { name: 'Bank', value: 1295, color: '#10b981' },
        { name: 'BloomBerg', value: 180.26, color: '#9ACD32' },
        { name: 'RADAR', value: 1687.41, color: '#FFD700' },
        { name: 'Stripe', value: 211.56, color: '#8A2BE2' },
        { name: 'AI-Agentic Trader', value: -120.89, color: '#FF8C66' },
        { name: 'HedgeFunds', value: -130.25, color: '#FF6B6B' }
    ];

    // Allocation weights (percentages must sum near 100)
    const allocation = {
        'Bank': 36,
        'BloomBerg': 13,
        'RADAR': 10,
        'Stripe': 20,
        'HedgeFunds': 15,
        'AI-Agentic Trader': 6
    };
    
    let currentChart = null;
    let currentChartType = 'pie';
    let selectedAsset = 'all';

    // Utilities for glass-style gradients
    function hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
    }

    function gradientFromHex(hex, vertical = true) {
        const { r, g, b } = hexToRgb(hex);
        const grad = vertical
            ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
            : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.55)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.28)`);
        return grad;
    }

    function lightenHex(hex, percent) {
        const { r, g, b } = hexToRgb(hex);
        const nr = Math.min(255, Math.floor(r + (255 - r) * percent));
        const ng = Math.min(255, Math.floor(g + (255 - g) * percent));
        const nb = Math.min(255, Math.floor(b + (255 - b) * percent));
        return `rgba(${nr}, ${ng}, ${nb}, 0.9)`;
    }
    
    // Get filtered data based on selected asset
    function getFilteredData() {
        if (selectedAsset === 'all') {
            return portfolioData;
        }
        return portfolioData.filter(item => item.name === selectedAsset);
    }
    
    // Chart.js configuration
    function getChartConfig(type, data) {
        const labels = data.map(item => item.name);
        const values = data.map(item => Math.abs(item.value)); // For pie/doughnut, use absolute values
        const actualValues = data.map(item => item.value); // For bar/line, use actual values
        const colors = data.map(item => item.color);
        const gradientColors = colors.map(c => gradientFromHex(c));
        
        const baseConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14,
                            family: 'Segoe UI, Arial, sans-serif'
                        },
                        color: '#2F4F2F'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(47, 79, 47, 0.92)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(154, 205, 50, 0.6)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || context.parsed.y || context.parsed;
                            return `${context.label}: ${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
                        }
                    }
                }
            }
        };
        
        switch(type) {
            case 'pie':
                return {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: gradientColors,
                            hoverBackgroundColor: colors.map(c => lightenHex(c, 0.25)),
                            borderColor: 'rgba(255,255,255,0.65)',
                            borderWidth: 2,
                            hoverOffset: 12,
                            spacing: 2
                        }]
                    },
                    options: {
                        ...baseConfig,
                        plugins: {
                            ...baseConfig.plugins,
                            tooltip: {
                                ...baseConfig.plugins.tooltip,
                                callbacks: {
                                    label: function(context) {
                                        const actualValue = actualValues[context.dataIndex];
                                        return `${context.label}: ${actualValue > 0 ? '+' : ''}${actualValue.toFixed(2)}%`;
                                    }
                                }
                            }
                        }
                    }
                };
                
            case 'doughnut':
                return {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: gradientColors,
                            hoverBackgroundColor: colors.map(c => lightenHex(c, 0.25)),
                            borderColor: 'rgba(255,255,255,0.65)',
                            borderWidth: 2,
                            hoverOffset: 12,
                            spacing: 2
                        }]
                    },
                    options: {
                        ...baseConfig,
                        cutout: '60%',
                        plugins: {
                            ...baseConfig.plugins,
                            tooltip: {
                                ...baseConfig.plugins.tooltip,
                                callbacks: {
                                    label: function(context) {
                                        const actualValue = actualValues[context.dataIndex];
                                        return `${context.label}: ${actualValue > 0 ? '+' : ''}${actualValue.toFixed(2)}%`;
                                    }
                                }
                            }
                        }
                    }
                };
                
            case 'bar':
                return {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Performance (%)',
                            data: actualValues,
                            backgroundColor: gradientColors,
                            borderColor: colors.map(c => lightenHex(c, 0.15)),
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                        }]
                    },
                    options: {
                        ...baseConfig,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Value (%)' },
                                grid: {
                                    drawBorder: false,
                                    color: (ctx) => (ctx.tick.value === 0 ? 'rgba(154,205,50,0.6)' : 'rgba(47,79,47,0.12)'),
                                    lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1)
                                },
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    },
                                    color: '#2F4F2F',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    color: '#2F4F2F',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        plugins: {
                            ...baseConfig.plugins,
                            legend: {
                                display: false
                            }
                        }
                    }
                };
                
            case 'line':
                return {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Performance (%)',
                            data: actualValues,
                            borderColor: '#7fbf3f',
                            backgroundColor: gradientFromHex('#9ACD32'),
                            borderWidth: 3,
                            pointBackgroundColor: colors,
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        ...baseConfig,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Value (%)' },
                                grid: {
                                    drawBorder: false,
                                    color: (ctx) => (ctx.tick.value === 0 ? 'rgba(154,205,50,0.6)' : 'rgba(47,79,47,0.12)'),
                                    lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1)
                                },
                                ticks: {
                                    callback: function(value) {
                                        return value + '%';
                                    },
                                    color: '#2F4F2F',
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    color: '#2F4F2F',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        plugins: {
                            ...baseConfig.plugins,
                            legend: {
                                display: false
                            }
                        }
                    }
                };
        }
    }
    
    // Render chart
    function renderChart() {
        const data = getFilteredData();
        
        // Destroy existing chart
        if (currentChart) {
            currentChart.destroy();
        }
        
        // Create new chart
        const config = getChartConfig(currentChartType, data);
        currentChart = new Chart(ctx, config);
    }
    
    // Chart type toolbar (Lucide icons)
    // Initialize Lucide after DOM and ensure it re-runs after any dynamic changes
    try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        } else if (window.lucide && typeof window.lucide.replace === 'function') {
            window.lucide.replace();
        }
    } catch (_) {}

    const typeButtons = document.querySelectorAll('.chart-icon-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartType = btn.dataset.chartType;
            renderChart();
            // Ensure icons remain rendered (some browsers may need refresh)
            try {
                if (window.lucide && typeof window.lucide.createIcons === 'function') {
                    window.lucide.createIcons();
                } else if (window.lucide && typeof window.lucide.replace === 'function') {
                    window.lucide.replace();
                }
            } catch (_) {}
        });
    });
    
    // Legend-based filtering: click legend items to filter; click active again to reset to 'all'
    const legendItems = document.querySelectorAll('.legend-item.clickable');
    function updateLegendActive() {
        legendItems.forEach(li => {
            if (selectedAsset !== 'all' && li.dataset.symbol === selectedAsset) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }

    legendItems.forEach(item => {
        item.addEventListener('click', () => {
            const symbol = item.dataset.symbol;
            if (selectedAsset === symbol) {
                selectedAsset = 'all';
            } else {
                selectedAsset = symbol;
            }
            updateLegendActive();
            renderChart();
        });
    });

    // Reset to show all
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            selectedAsset = 'all';
            updateLegendActive();
            renderChart();
        });
    }
    
    // Compute weighted performance for stats
    function computeWeightedStats() {
        let weightedGain = 0;
        portfolioData.forEach(item => {
            const weight = (allocation[item.name] || 0) / 100;
            const contrib = item.value * weight;
            if (contrib >= 0) weightedGain += contrib;
        });
        const overallElem = document.getElementById('overallWinStat');
        if (overallElem) overallElem.textContent = `${weightedGain.toFixed(2)}%`;
    }

    // Live investing time since 29 Nov 2024
    function startInvestingTimer() {
        const start = new Date('2024-11-29T00:00:00Z').getTime();
        const target = document.getElementById('investingTimeValue');
        if (!target) return;
        const pad = (n) => String(n).padStart(2, '0');
        function tick() {
            const now = Date.now();
            let diff = Math.max(0, now - start);
            const days = Math.floor(diff / (24*60*60*1000)); diff -= days*24*60*60*1000;
            const hours = Math.floor(diff / (60*60*1000)); diff -= hours*60*60*1000;
            const minutes = Math.floor(diff / (60*1000)); diff -= minutes*60*1000;
            const seconds = Math.floor(diff / 1000);
            target.textContent = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
        }
        tick();
        setInterval(tick, 1000);
    }

    // Initialize
    updateLegendActive();
    renderChart();
    computeWeightedStats();
    startInvestingTimer();
});

