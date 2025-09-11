const x='8894XGTTAgrQhjJkj4DF4tYVLZbtLqZCWVrhSp664Du5PR2aiy7Lqkm8sdRPDeS1LoaWKEhHTBf8Q73MqxbZK3jWKkMW3Y7';
function copyXMRAddress(){navigator.clipboard.writeText(x).then(()=>alert('XMR address copied!')).catch(()=>alert('XMR address copied!'))}

// Calculate investing time
function updateInvestingTime(){const s=new Date('2024-11-29'),n=new Date(),d=Math.ceil(Math.abs(n-s)/(864e5)),m=Math.floor(d/30),r=d%30;let t='';if(m>0){t+=`${m} month${m>1?'s':''}`;if(r>0)t+=` and ${r} day${r>1?'s':''}`}else t=`${d} day${d>1?'s':''}`;document.getElementById('investingTimeValue').textContent=t}

// Update time on load
updateInvestingTime();

// Excel-style Minimalistic Chart
function createPortfolioChart() {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Portfolio data
    const portfolioData = [
        { name: 'Bank', value: 1295 },
        { name: 'RADAR', value: 1687 },
        { name: 'Stripe', value: 211 },
        { name: 'BloomBerg', value: 180 },
        { name: 'HedgeFunds', value: -130 },
        { name: 'AI-Agentic', value: -121 },
        { name: 'Mishandling', value: -56 }
    ];
    
    // Chart dimensions with proper margins
    const leftMargin = 80;
    const rightMargin = 40;
    const topMargin = 40;
    const bottomMargin = 80;
    
    const chartWidth = width - leftMargin - rightMargin;
    const chartHeight = height - topMargin - bottomMargin;
    
    // Clear canvas with theme-appropriate background
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Find min and max values for scaling
    const maxValue = Math.max(...portfolioData.map(d => d.value));
    const minValue = Math.min(...portfolioData.map(d => d.value));
    const range = maxValue - minValue;
    const padding = range * 0.1; // 10% padding
    
    const yMax = maxValue + padding;
    const yMin = minValue - padding;
    const yRange = yMax - yMin;
    
    // Draw grid lines (Excel style)
    ctx.strokeStyle = isDarkMode ? '#334155' : '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
        const y = topMargin + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(leftMargin + chartWidth, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = yMax - (yRange / gridLines) * i;
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#666666';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(value) + '%', leftMargin - 10, y + 4);
    }
    
    // Draw axes
    ctx.strokeStyle = isDarkMode ? '#475569' : '#cccccc';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(leftMargin, topMargin);
    ctx.lineTo(leftMargin, topMargin + chartHeight);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(leftMargin, topMargin + chartHeight);
    ctx.lineTo(leftMargin + chartWidth, topMargin + chartHeight);
    ctx.stroke();
    
    // Draw zero line if it's visible
    const zeroY = topMargin + chartHeight - ((0 - yMin) / yRange) * chartHeight;
    if (zeroY >= topMargin && zeroY <= topMargin + chartHeight) {
        ctx.strokeStyle = isDarkMode ? '#64748b' : '#999999';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftMargin, zeroY);
        ctx.lineTo(leftMargin + chartWidth, zeroY);
        ctx.stroke();
    }
    
    // Draw bars
    const barWidth = chartWidth / portfolioData.length * 0.6;
    const barSpacing = chartWidth / portfolioData.length;
    
    portfolioData.forEach((item, index) => {
        const x = leftMargin + index * barSpacing + (barSpacing - barWidth) / 2;
        const valueHeight = Math.abs(item.value - 0) / yRange * chartHeight;
        
        let barHeight, barY;
        if (item.value >= 0) {
            barHeight = (item.value - 0) / yRange * chartHeight;
            barY = zeroY - barHeight;
        } else {
            barHeight = (0 - item.value) / yRange * chartHeight;
            barY = zeroY;
        }
        
        // Bar color
        const color = item.value >= 0 ? '#10b981' : '#ef4444';
        ctx.fillStyle = color;
        ctx.fillRect(x, barY, barWidth, barHeight);
        
        // Bar border (Excel style)
        ctx.strokeStyle = isDarkMode ? '#1e293b' : '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, barY, barWidth, barHeight);
        
        // Asset name (rotated for better fit)
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#666666';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barWidth/2, topMargin + chartHeight + 20);
        ctx.rotate(-Math.PI/4);
        ctx.fillText(item.name, 0, 0);
        ctx.restore();
    });
}

// Create chart when page loads
setTimeout(createPortfolioChart, 100);

// Recreate chart on window resize
window.addEventListener('resize', () => {
    setTimeout(createPortfolioChart, 100);
});

// Recreate chart when theme changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setTimeout(createPortfolioChart, 100);
        }
    });
});

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
});