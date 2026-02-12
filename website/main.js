
// scroll-triggered fade-in animations
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

// install tab switching
const commands = {
    npm: 'npm install -g @trillionclues/contour',
    pnpm: 'pnpm add -g @trillionclues/contour',
    npx: 'npx @trillionclues/contour start examples/sample-api.yaml',
};

document.querySelectorAll('.install-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.install-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const pkg = tab.dataset.pkg;
        const cmdEl = document.getElementById('install-command');
        cmdEl.innerHTML = `<span class="prompt">$</span> <span class="cmd">${commands[pkg]}</span>`;
    });
});

// copy buttons
function showCopied(btn) {
    const original = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:12px;color:var(--accent)">✓</span>';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
}

// Terminal copy
document.querySelectorAll('.terminal-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(() => showCopied(btn));
    });
});

// Install copy
const copyInstall = document.getElementById('copy-install');
if (copyInstall) {
    copyInstall.addEventListener('click', () => {
        const activeTab = document.querySelector('.install-tab.active');
        const pkg = activeTab?.dataset.pkg || 'npm';
        navigator.clipboard.writeText(commands[pkg]).then(() => showCopied(copyInstall));
    });
}
