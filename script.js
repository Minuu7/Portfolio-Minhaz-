// ============================================
// script.js — Portfolio logic with Supabase
// ============================================

// --- 1. INITIALIZE SUPABASE CLIENT ---
const SUPABASE_URL = 'https://iziplygbqvqhtszncmhy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aXBseWdicXZxaHRzem5jbWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzA4NzcsImV4cCI6MjEwNDk0Njg3N30.M0NlYBhE4mpkEaJLf71OjAwEvBTEbCMS88VmVNE63gg';

// Use a different variable name than 'supabase' to avoid CDN conflict
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async function () {

  // ============================================================
  // THEME TOGGLE (unchanged)
  // ============================================================
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle.querySelector('i');
  const root = document.documentElement;

  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      root.removeAttribute('data-theme');
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  }

  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  themeToggle.addEventListener('click', function () {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // ============================================================
  // FETCH AND RENDER PROJECTS FROM SUPABASE
  // ============================================================
  async function loadProjects() {
    const { data, error } = await db
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    const projectGrid = document.getElementById('projectGrid');
    if (!projectGrid) return;

    if (!data || data.length === 0) {
      projectGrid.innerHTML = '<p class="empty-state">No projects yet.</p>';
      return;
    }

    projectGrid.innerHTML = data.map(p => `
      <div class="project-card">
        <img src="${p.image || 'https://placehold.co/600x400/2563eb/white?text=Project'}" alt="${p.title}" loading="lazy">
        <div class="project-info">
          <h3>${p.title}</h3>
          <div class="project-tags">${(p.tags || []).map(t => `<span>${t}</span>`).join('')}</div>
          <p>${p.description || ''}</p>
          ${p.link ? `<a href="${p.link}" class="project-link" target="_blank" rel="noopener">View Project <i class="fas fa-arrow-right"></i></a>` : ''}
        </div>
      </div>
    `).join('');
  }

  // ============================================================
  // FETCH AND RENDER SHOWCASE FROM SUPABASE
  // ============================================================
  async function loadShowcase() {
    const { data, error } = await db
      .from('showcase')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading showcase:', error);
      return;
    }

    const showcaseGrid = document.getElementById('showcaseGrid');
    if (!showcaseGrid) return;

    if (!data || data.length === 0) {
      showcaseGrid.innerHTML = '<p class="empty-state">No showcase items yet.</p>';
      return;
    }

    // Store the data globally for the modal
    window.showcaseData = data;

    showcaseGrid.innerHTML = data.map((item, i) => `
      <div class="showcase-item" data-index="${i}">
        <div class="showcase-media-wrap ${item.type === 'video' ? 'is-video' : ''}">
          ${item.type === 'video'
            ? `<video class="showcase-media" muted preload="metadata"><source src="${item.src}" type="video/mp4"></video>`
            : `<img class="showcase-media" src="${item.src}" alt="${item.title}" loading="lazy">`
          }
          <span class="showcase-kind">
            <i class="fas ${item.type === 'video' ? 'fa-video' : 'fa-image'}"></i>
            ${item.type}
          </span>
        </div>
        <div class="showcase-caption">
          <h4>${item.title}</h4>
          <p>${item.description || ''}</p>
        </div>
      </div>
    `).join('');

    // Attach click listeners for the modal
    showcaseGrid.querySelectorAll('.showcase-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index, 10);
        openMedia(window.showcaseData[idx]);
      });
    });
  }

  // ============================================================
  // FETCH AND RENDER EDUCATION FROM SUPABASE
  // ============================================================
 const educationData = [
    {
      degree: "B.Sc. in Computer Science & Engineering",
      institution: "Premier University Chittagong",
      period: "2023 – 2027",
      description: "Focused on Data Science, AI, and Machine Learning."
    },
    {
      degree: "School & Higher Secondary School",
      institution: "Navy Anchorage School & College Chattogram",
      period: "2015 – 2021",
      description: "Science stream."
    }
  ];

  function renderEducation() {
    const grid = document.getElementById('educationGrid');
    if (!grid) return;

    grid.innerHTML = educationData.map(e => `
      <div class="education-card">
        <h3><i class="fas fa-graduation-cap"></i> ${e.degree}</h3>
        <div class="edu-meta">${e.institution} · ${e.period}</div>
        <div class="edu-desc">${e.description}</div>
      </div>
    `).join('');
  }

  // ============================================================
  // MEDIA MODAL (image zoom + video play)
  // ============================================================
  const modal = document.getElementById('mediaModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  const modalControls = document.getElementById('modalControls');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomResetBtn = document.getElementById('zoomReset');

  let currentZoom = 1;
  let currentImg = null;

  function openMedia(item) {
    modalBody.innerHTML = '';

    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      modalBody.appendChild(video);
      modalControls.classList.add('video-mode');
      currentImg = null;
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.title;
      modalBody.appendChild(img);
      modalControls.classList.remove('video-mode');
      currentImg = img;
      currentZoom = 1;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMedia() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modalBody.innerHTML = '';
    document.body.style.overflow = '';
    currentZoom = 1;
    currentImg = null;
  }

  function applyZoom(z) {
    currentZoom = Math.min(Math.max(z, 0.4), 4);
    if (currentImg) currentImg.style.transform = `scale(${currentZoom})`;
  }

  modalClose.addEventListener('click', closeMedia);
  modal.addEventListener('click', e => { if (e.target === modal) closeMedia(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('active')) closeMedia(); });

  zoomInBtn.addEventListener('click', () => applyZoom(currentZoom + 0.2));
  zoomOutBtn.addEventListener('click', () => applyZoom(currentZoom - 0.2));
  zoomResetBtn.addEventListener('click', () => applyZoom(1));

  // ============================================================
  // SMOOTH SCROLL (unchanged)
  // ============================================================
  document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================================
  // INITIAL LOAD — fetch all data from Supabase
  // ============================================================
  await loadProjects();
  renderEducation();

  console.log('🚀 Portfolio loaded from Supabase!');
});