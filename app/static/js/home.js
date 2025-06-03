fetch('/static/assets/navbar/navbar.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('navbarContainer').innerHTML = data;

    // Active Link Highlighting Logic AFTER navbar loads
    const path = window.location.pathname;

    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (path === href || path.startsWith(href + "/") || path.endsWith(href)) {
        link.classList.add('active');
      }
    });
  });


// **** Pop Up Windows **** 

// prevent default general window from showing 
window.addEventListener('load', () => {
  const windowPopup = document.getElementById('homeWindow');
  if (sessionStorage.getItem('windowVisible') === 'true') {
    windowPopup.style.display = 'block';
  } else {
    windowPopup.style.display = 'none';
  }
});

// exit button functionality 
document.querySelector('.windowExit').addEventListener('click', function () {
  const windowPopup = document.getElementById('homeWindow');
  windowPopup.style.display = 'none';
  sessionStorage.removeItem('windowVisible');
});

function showWindow(contentHTML, customClass = '') {
  const windowPopup = document.getElementById('homeWindow');
  const windowContent = windowPopup.querySelector('.windowContent');
  const contentContainer = windowPopup.querySelector('#windowInnerContent');

  // Reset previous styles
  windowContent.className = 'windowContent';

  // Add a custom class for styling (e.g., 'goalsWindow')
  if (customClass) {
    windowContent.classList.add(customClass);
  }

  // Inject the HTML and show the popup
  contentContainer.innerHTML = contentHTML;
  windowPopup.style.display = 'block';
  sessionStorage.setItem('windowVisible', 'true');
}


document.getElementById('goalsBubble').addEventListener('click', () => {
  showWindow(`
    <section id="goalContent">
      <h2 style="
        color: #285d9b;
        font-size: 1.5rem;
        margin-bottom: 1rem;
        text-align: center;
      ">
        My Skincare Goals
      </h2>
      <div id="goalsContainer" style="display: flex; gap: 1rem;"></div>
    </section>
  `, 'goalsWindow');

  loadGoals();
});


async function loadGoals() {
  const goalsContainer = document.getElementById('goalsContainer');
  if (!goalsContainer) return;

  goalsContainer.innerHTML = '';

  let data;
  try {
    const res = await fetch('/goals', { credentials: 'include' });
    if (!res.ok) {
      console.error('Failed to fetch goals');
      return;
    }
    data = await res.json();
  } catch (err) {
    console.error(err);
    return;
  }

  ['daily', 'weekly', 'monthly'].forEach(type => {
    const block = createGoalBlock(type, data[type] || []);
    goalsContainer.appendChild(block);
  });

  attachDeleteListeners();
  attachNewEntryListeners();
}


function createGoalBlock(type, goalsArray) {
  const block = document.createElement('div');
  block.classList.add('goalBlock');
  block.style.backgroundColor = '#e8f6ff';
  block.style.borderRadius = '8px';
  block.style.padding = '1rem';
  block.style.flex = '1'; 

  const heading = document.createElement('h3');
  heading.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Goals:`;
  heading.style.textAlign = 'center';
  heading.style.color = '#285d9b';
  heading.style.marginBottom = '0.5rem';
  block.appendChild(heading);

  const listDiv = document.createElement('div');
  listDiv.classList.add('goalList');
  listDiv.style.display = 'flex';
  listDiv.style.flexDirection = 'column';
  listDiv.style.gap = '0.5rem';
  listDiv.style.maxHeight = '300px';
  listDiv.style.overflowY = 'auto';

  goalsArray.forEach(goal => {
    const item = document.createElement('div');
    item.classList.add('goalItem');
    item.dataset.id = goal.id; 

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.marginRight = '0.5rem';
    cb.style.width = '1rem';
    cb.style.height = '1rem';
    item.appendChild(cb);

    const span = document.createElement('span');
    span.textContent = goal.text;
    span.style.flexGrow = '1';
    span.style.color = '#1e3f72';
    span.style.fontSize = '0.95rem';
    item.appendChild(span);

    listDiv.appendChild(item);
  });

  const newRow = document.createElement('div');
  newRow.classList.add('goalItem', 'new');

  const newCb = document.createElement('input');
  newCb.type = 'checkbox';
  newCb.disabled = true;
  newCb.style.marginRight = '0.5rem';
  newCb.style.width = '1rem';
  newCb.style.height = '1rem';
  newRow.appendChild(newCb);

  const newSpan = document.createElement('span');
  newSpan.setAttribute('contenteditable', 'true');
  newSpan.style.borderBottom = '1px dotted #999';
  newSpan.style.flexGrow = '1';
  newSpan.style.color = '#285d9b';
  newSpan.style.fontSize = '0.95rem';
  newSpan.style.padding = '0.2rem 0';
  newSpan.dataset.type = type;   
  newSpan.dataset.new = 'true';  
  newSpan.textContent = '';   
  newRow.appendChild(newSpan);

  listDiv.appendChild(newRow);

  block.appendChild(listDiv);
  return block;
}


function attachDeleteListeners() {
  document
    .querySelectorAll('.goalItem input[type="checkbox"]')
    .forEach(checkbox => {
      if (checkbox.disabled) return;

      const freshCb = checkbox.cloneNode(true);
      checkbox.replaceWith(freshCb);

      freshCb.addEventListener('change', async () => {
        if (!freshCb.checked) return; // only act when it becomes checked
        const itemDiv = freshCb.closest('.goalItem');
        const goalId = itemDiv.dataset.id;
        try {
          const res = await fetch(`/goals/${goalId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            console.error('Failed to delete goal', await res.text());
            return;
          }
          setTimeout(() => {
            if (itemDiv) itemDiv.remove();
          }, 500);
        } catch (err) {
          console.error(err);
        }
      });
    });
}


function attachNewEntryListeners() {
  document
    .querySelectorAll('span[contenteditable][data-new="true"]')
    .forEach(span => {
      const freshSpan = span.cloneNode(true);
      span.replaceWith(freshSpan);

      freshSpan.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = freshSpan.textContent.trim();
          const type = freshSpan.dataset.type; 

          if (!text) {
            freshSpan.textContent = '';
            return;
          }

          try {
            const payload = {
              goal_type: type,
              goal_text: text
            };
            const postRes = await fetch('/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            });
            if (!postRes.ok) {
              console.error('Failed to add new goal:', await postRes.text());
              return;
            }
            loadGoals();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });
}


window.addEventListener('load', async () => {
  try {
    const res = await fetch('/login_metrics', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      console.error('Could not load login metrics:', res.statusText);
      return;
    }
    const data = await res.json();
    const streakElem = document.getElementById('streakCount');
    if (streakElem) {
      if (data.current_streak == '1') {
        streakElem.textContent = data.current_streak + ' day';
      } else {
        streakElem.textContent = data.current_streak + ' days';
      }
    }
  } catch (err) {
    console.error('Error fetching streak count:', err);
  }
});
