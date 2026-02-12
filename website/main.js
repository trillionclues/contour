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

function showCopied(btn) {
    const original = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:12px;color:var(--accent)">✓</span>';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
}

document.querySelectorAll('.terminal-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(() => showCopied(btn));
    });
});

const copyInstall = document.getElementById('copy-install');
if (copyInstall) {
    copyInstall.addEventListener('click', () => {
        const activeTab = document.querySelector('.install-tab.active');
        const pkg = activeTab?.dataset.pkg || 'npm';
        navigator.clipboard.writeText(commands[pkg]).then(() => showCopied(copyInstall));
    });
}


// terminal animation
const terminalBody = document.getElementById('hero-terminal-body');

if (terminalBody) {
    const TYPING_SPEED = 50;
    const PAUSE_SHORT = 300;
    const PAUSE_MEDIUM = 600;
    const PAUSE_LONG = 1200;
    const LOG_INTERVAL = 1200;
    const LOGS_BEFORE_RESTART = 6;

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const routes = [
        '/users',
        '/users/123',
        '/posts',
        '/posts/456',
        '/auth/login',
        '/products',
        '/orders/789',
        '/health'
    ];

    let animationRunning = false;
    let logCount = 0;
    let logInterval = null;

    function createLine(content) {
        const line = document.createElement('div');
        line.classList.add('line');
        if (content) line.innerHTML = content;
        return line;
    }

    function addLine(content, instant = false) {
        const line = createLine(content);
        if (instant) {
            line.style.opacity = '1';
        } else {
            line.style.opacity = '0';
            line.style.animation = 'fadeInLine 0.3s ease forwards';
        }
        terminalBody.appendChild(line);
        smoothScroll();
        return line;
    }

    function smoothScroll() {
        terminalBody.scrollTo({
            top: terminalBody.scrollHeight,
            behavior: 'smooth'
        });
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    }

    function getStatusClass(status) {
        if (status >= 500) return 'red';
        if (status >= 400) return 'yellow';
        return 'green';
    }

    function random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Generate realistic server log
    function generateServerLog() {
        const method = random(methods);
        const route = random(routes);

        let status = 200;
        if (method === 'POST') status = 201;
        if (method === 'DELETE') status = 204;

        const rand = Math.random();
        if (rand > 0.92) status = 500;
        else if (rand > 0.88) status = 404;
        else if (rand > 0.84) status = 400;

        const ms = Math.floor(Math.random() * 95) + 5;
        const time = ms + 'ms';
        const timeString = getTime();
        const statusClass = getStatusClass(status);

        return `<span class="dim">[${timeString}]</span> <span class="cyan">${method.padEnd(6)}</span>${route} <span class="${statusClass}">${status}</span> <span class="dim">${time}</span>`;
    }

    // animation sequence
    async function runAnimation() {
        if (animationRunning) return;
        animationRunning = true;

        // Clear terminal
        terminalBody.innerHTML = '';
        logCount = 0;
        if (logInterval) clearInterval(logInterval);

        // 1. Installation
        await wait(500);
        addLine('<span class="prompt">$</span> <span class="cmd">npm install -g @trillionclues/contour</span>');
        await wait(PAUSE_LONG);
        addLine('<span class="success">✔</span> <span class="dim">Installed successfully</span>');
        await wait(PAUSE_MEDIUM);
        addLine('');
        await wait(PAUSE_SHORT);

        // 2. Start server
        addLine('<span class="prompt">$</span> <span class="cmd">contour start openapi.yaml</span>');
        await wait(PAUSE_LONG);
        addLine('');
        addLine('<span class="cyan bold"> ⬡ Contour</span>');
        await wait(PAUSE_SHORT);
        addLine('<span class="dim"> Shape your API mocks from OpenAPI specs</span>');
        await wait(PAUSE_MEDIUM);
        addLine('');
        addLine('<span class="success">✓</span> <span class="bold">Mock server running</span>');
        await wait(PAUSE_SHORT);
        addLine('');
        addLine(' <span class="dim">→</span> Local: <span class="cyan">http://localhost:3001</span>');
        await wait(PAUSE_SHORT);
        addLine(' <span class="dim">→</span> Endpoints: <span class="yellow">8</span>');
        await wait(PAUSE_SHORT);
        addLine('');
        addLine('<span class="dim"> Press Ctrl+C to stop</span>');
        await wait(PAUSE_LONG);
        addLine('');

        // 3. Curl request
        addLine('<span class="prompt">$</span> <span class="cmd">curl http://localhost:3001/users</span>');
        await wait(PAUSE_LONG);

        // 4. JSON Response
        addLine('<span class="cyan">[</span>');
        await wait(100);
        addLine('  <span class="cyan">{</span>');
        await wait(100);
        addLine('    <span class="magenta">"id"</span>: <span class="yellow">"user_2dkJ89"</span>,');
        await wait(100);
        addLine('    <span class="magenta">"name"</span>: <span class="yellow">"Sarah Chen"</span>,');
        await wait(100);
        addLine('    <span class="magenta">"email"</span>: <span class="yellow">"sarah.chen@gmail.com"</span>,');
        await wait(100);
        addLine('    <span class="magenta">"phone"</span>: <span class="yellow">"(555) 342-8190"</span>,');
        await wait(100);
        addLine('    <span class="magenta">"role"</span>: <span class="yellow">"admin"</span>');
        await wait(100);
        addLine('  <span class="cyan">}</span>');
        await wait(100);
        addLine('<span class="cyan">]</span>');
        await wait(PAUSE_LONG);
        addLine('');

        // addLine('<span class="dim">Server logs:</span>');
        // await wait(PAUSE_SHORT);
        // addLine('');

        logInterval = setInterval(() => {
            if (logCount >= LOGS_BEFORE_RESTART) {
                clearInterval(logInterval);
                setTimeout(() => {
                    animationRunning = false;
                    runAnimation();
                }, 2000);
                return;
            }

            addLine(generateServerLog());
            logCount++;

            while (terminalBody.children.length > 35) {
                terminalBody.removeChild(terminalBody.children[0]);
            }
        }, LOG_INTERVAL);
    }

    // Start animation after short delay
    setTimeout(() => {
        runAnimation();
    }, 1000);
}