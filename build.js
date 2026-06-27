const fs = require('fs');
const path = require('path');

const contentMd = fs.readFileSync(path.join(__dirname, 'content.md'), 'utf8');
let templateHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// Helper to clean up backticks (if any spacing was added)
const cleanedContent = contentMd.replace(/` ` `/g, '```');

// 1. Parse Frontmatter
const frontmatterMatch = cleanedContent.match(/^---\n([\s\S]*?)\n---/);
if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split('\n');
    lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            const regex = new RegExp(`{{${key}}}`, 'g');
            templateHtml = templateHtml.replace(regex, value);
        }
    });
}

// Helper to parse basic markdown links and bold text
function parseInline(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

// 2. Parse "About Me"
const aboutMatch = cleanedContent.match(/# About Me\n([\s\S]*?)(?=\n# |$)/);
if (aboutMatch) {
    let aboutHtml = '';
    const paragraphs = aboutMatch[1].trim().split('\n\n');
    paragraphs.forEach(p => {
        if (p.startsWith('> **Current Focus:**')) {
            const focusContent = p.replace('> **Current Focus:**', '').trim();
            aboutHtml += `
                <div class="highlight-box">
                    <h4>Current Focus</h4>
                    <p>${parseInline(focusContent)}</p>
                </div>`;
        } else {
            aboutHtml += `<p>${parseInline(p)}</p>\n`;
        }
    });
    templateHtml = templateHtml.replace('{{ABOUT_ME}}', aboutHtml);
}

// 3. Parse "Experience"
const expMatch = cleanedContent.match(/# Experience\n([\s\S]*?)(?=\n# |$)/);
if (expMatch) {
    let expHtml = '';
    const items = expMatch[1].trim().split('\n## ');
    items.forEach(item => {
        if (!item.trim()) return;
        const lines = item.trim().split('\n');
        const title = lines[0].replace(/^## /, '').trim();
        
        let date = '', subtitle = '', descHtml = '';
        const descLines = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('**Date:**')) date = line.replace('**Date:**', '').trim();
            else if (line.startsWith('**Subtitle:**')) subtitle = line.replace('**Subtitle:**', '').trim();
            else if (line.startsWith('**Company:**')) subtitle = line.replace('**Company:**', '').trim();
            else if (line.startsWith('- ')) {
                descLines.push(`<li>${parseInline(line.substring(2))}</li>`);
            } else if (line.trim() !== '') {
                descLines.push(`<p>${parseInline(line)}</p>`);
            }
        }
        
        if (descLines.some(l => l.startsWith('<li>'))) {
            let ul = '<ul>\n';
            let formattedDesc = '';
            descLines.forEach(l => {
                if (l.startsWith('<li>')) ul += l + '\n';
                else formattedDesc += l + '\n';
            });
            ul += '</ul>\n';
            descHtml = formattedDesc + ul;
        } else {
            descHtml = descLines.join('\n');
        }

        const isEdu = title.toLowerCase().includes('ph.d.') || title.toLowerCase().includes('m.s.');
        const timelineClass = isEdu ? 'timeline-item education-timeline' : 'timeline-item';
        
        expHtml += `
            <div class="${timelineClass}">
                <div class="timeline-marker"></div>
                <div class="timeline-date">${date}</div>
                <h4 class="timeline-title">${title}</h4>
                <div class="timeline-subtitle">${subtitle}</div>
                <div class="timeline-desc">
                    ${descHtml}
                </div>
            </div>
        `;
    });
    templateHtml = templateHtml.replace('{{EXPERIENCE_ITEMS}}', expHtml);
}

// 4. Parse "Publications"
const pubMatch = cleanedContent.match(/# Publications\n([\s\S]*?)(?=\n# |$)/);
if (pubMatch) {
    let pubHtml = '';
    const items = pubMatch[1].trim().split('\n## ');
    items.forEach((item, index) => {
        if (!item.trim()) return;
        
        // Extract bibtex safely
        let bibtex = '';
        let cleanItem = item;
        const bibMatch = item.match(/```bibtex\n([\s\S]*?)\n```/);
        if (bibMatch) {
            bibtex = bibMatch[1].trim();
            cleanItem = item.replace(/```bibtex\n[\s\S]*?\n```/, '');
        }

        const lines = cleanItem.trim().split('\n');
        const title = lines[0].replace(/^## /, '').trim();
        
        let type = '', venue = '', authors = '', pdf = '', video1 = '', video2 = '';
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('**Type:**')) type = line.replace('**Type:**', '').trim();
            else if (line.startsWith('**Venue:**')) venue = line.replace('**Venue:**', '').trim();
            else if (line.startsWith('**Authors:**')) authors = parseInline(line.replace('**Authors:**', '').trim());
            else if (line.startsWith('**PDF:**')) pdf = line.replace('**PDF:**', '').trim();
            else if (line.startsWith('**Video1:**')) video1 = line.replace('**Video1:**', '').trim();
            else if (line.startsWith('**Video2:**')) video2 = line.replace('**Video2:**', '').trim();
        }
        
        const typeClass = type.toLowerCase().includes('report') || type.toLowerCase().includes('thesis') ? 'report' : 'conference';
        const pubId = `bib-pub${index}`;
        
        let linksHtml = '';
        if (pdf) {
            linksHtml += `<a href="${pdf}" target="_blank" class="pub-link"><i class="fas fa-file-pdf"></i> PDF</a>\n`;
        }
        if (bibtex) {
            linksHtml += `<button class="pub-link cite-btn" onclick="toggleBibtex('${pubId}')"><i class="fas fa-quote-right"></i> Cite (BibTeX)</button>\n`;
        }
        if (video1) {
            linksHtml += `<a href="${video1}" target="_blank" class="pub-link"><i class="fab fa-youtube"></i> Video</a>\n`;
        }
        if (video2) {
            linksHtml += `<a href="${video2}" target="_blank" class="pub-link"><i class="fab fa-youtube"></i> Video</a>\n`;
        }

        let bibtexHtml = '';
        if (bibtex) {
            bibtexHtml = `
            <div class="bibtex-container" id="${pubId}">
                <div class="bibtex-box"><button class="copy-bib-btn" onclick="copyBibtex('${pubId}-text')" title="Copy BibTeX"><i class="far fa-copy"></i></button><span id="${pubId}-text">${bibtex}</span></div>
            </div>`;
        }

        pubHtml += `
            <div class="pub-card ${typeClass}">
                <span class="pub-type-badge">${type}</span>
                <h3 class="pub-title">${title}</h3>
                <div class="pub-authors">${authors}</div>
                <div class="pub-venue">${venue}</div>
                <div class="pub-links">
                    ${linksHtml}
                </div>
                ${bibtexHtml}
            </div>
        `;
    });
    templateHtml = templateHtml.replace('{{PUBLICATIONS_ITEMS}}', pubHtml);
}

// 5. Parse "Skills"
const skillsMatch = cleanedContent.match(/# Skills\n([\s\S]*?)(?=\n# |$)/);
if (skillsMatch) {
    let skillsHtml = '';
    const categories = skillsMatch[1].trim().split('\n## ');
    categories.forEach(cat => {
        if (!cat.trim()) return;
        const lines = cat.trim().split('\n');
        const title = lines[0].replace(/^## /, '').trim();
        
        let icon = 'fa-code';
        if (title.toLowerCase().includes('planning')) icon = 'fa-route';
        if (title.toLowerCase().includes('perception')) icon = 'fa-eye';

        let listHtml = '';
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('- ')) {
                const skill = line.substring(2);
                let skillIcon = 'fa-circle-notch';
                if (skill.includes('C++') || skill.includes('Python')) skillIcon = 'fab ' + (skill.includes('C++') ? 'fa-cuttlefish' : 'fa-python');
                if (skill.includes('Git')) skillIcon = 'fab fa-git-alt';
                if (skill.includes('Linux')) skillIcon = 'fab fa-linux';
                
                listHtml += `<div class="skill-tag"><i class="fas ${skillIcon.replace('fas ', '')}"></i> ${skill}</div>\n`;
            }
        }

        skillsHtml += `
            <div class="skills-category">
                <h3><i class="fas ${icon}"></i> ${title}</h3>
                <div class="skills-list">
                    ${listHtml}
                </div>
            </div>
        `;
    });
    templateHtml = templateHtml.replace('{{SKILLS_ITEMS}}', skillsHtml);
}

// Write the final index.html
fs.writeFileSync(path.join(__dirname, 'index.html'), templateHtml);
console.log('Successfully generated index.html from content.md!');
