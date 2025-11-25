// Global data storage
let projectsData = null;
let homeData = null;
let blogData = null;

// Load projects data from JSON
async function loadProjectsData() {
    try {
        const response = await fetch('/data/projects.json');
        projectsData = await response.json();
        return projectsData;
    } catch (error) {
        console.error('Error loading projects data:', error);
        return null;
    }
}

// Load home data from JSON
async function loadHomeData() {
    try {
        const response = await fetch('/data/home-data.json');
        homeData = await response.json();
        return homeData;
    } catch (error) {
        console.error('Error loading home data:', error);
        return null;
    }
}

// Load markdown from GitHub
async function loadProjectMarkdown() {
    if (!projectsData || !projectsData.projects) return;

    for (const project of projectsData.projects) {
        try {
            const response = await fetch(`/api/markdown?url=${encodeURIComponent(project.readmeUrl)}`);
            const data = await response.json();

            if (data.success) {
                const markdownContainer = document.getElementById(`${project.id}-markdown`);
                // Parse markdown
                let html = marked.parse(data.content);
                // Fix relative image URLs to point to GitHub
                html = fixImageUrls(html, project.githubUrl);
                markdownContainer.innerHTML = html;
            } else {
                document.getElementById(`${project.id}-markdown`).innerHTML =
                    `<p style="color: #e74c3c;">Error loading documentation: ${data.error}</p>`;
            }
        } catch (error) {
            document.getElementById(`${project.id}-markdown`).innerHTML =
                `<p style="color: #e74c3c;">Error loading documentation: ${error.message}</p>`;
        }
    }
}

// Fix relative image URLs in markdown HTML
function fixImageUrls(html, githubUrl) {
    // Extract owner and repo from GitHub URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return html;

    const [, owner, repo] = match;
    const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/`;

    // Replace relative image paths with absolute GitHub URLs
    return html.replace(/<img([^>]*?)src="(?!http)([^"]+)"/g, (match, attrs, src) => {
        // Remove leading ./ or /
        const cleanSrc = src.replace(/^\.?\//, '');
        return `<img${attrs}src="${baseUrl}${cleanSrc}"`;
    });
}

// Save projects data to server
async function saveProjectsData() {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectsData)
        });

        if (!response.ok) {
            throw new Error('Failed to save projects');
        }

        return true;
    } catch (error) {
        console.error('Error saving projects:', error);
        alert('Error saving projects. Please check if the server is running.')
        return false;
    }
}

// Save home data to server
async function saveHomeData() {
    try {
        const response = await fetch('/api/home', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(homeData)
        });

        if (!response.ok) {
            throw new Error('Failed to save home data');
        }

        return true;
    } catch (error) {
        console.error('Error saving home data:', error);
        alert('Error saving home data. Please check if the server is running.')
        return false;
    }
}

// Load blog data from JSON
async function loadBlogData() {
    try {
        const response = await fetch('/data/blog-data.json');
        blogData = await response.json();
        return blogData;
    } catch (error) {
        console.error('Error loading blog data:', error);
        return null;
    }
}

// Save blog data to server
async function saveBlogData(data) {
    try {
        const response = await fetch('/api/blog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error saving blog data:', error);
        return { success: false, error: error.message };
    }
}