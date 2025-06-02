// **** Nav Bar Rendering (per page)  ****
fetch('/static/assets/navbar/navbar.html')
.then(res => res.text())
.then(data => {
  document.getElementById('navbarContainer').innerHTML = data;
});


// **** Pop Up Windows **** 

// prevent default general window from showing 
window.addEventListener('load', () => {
  const windowPopup = document.getElementById('homeWindow');
  if (sessionStorage.getItem('windowVisible') === 'true'){
    windowPopup.style.display = 'block';
  } 
  else{
    windowPopup.style.display = 'none';
  }
});

// exit button functionality 
document.querySelector('.windowExit').addEventListener('click', function () {
  const windowPopup = document.getElementById('homeWindow');
  windowPopup.style.display = 'none';
  sessionStorage.removeItem('windowVisible');
});

function showWindow(contentHTML, customClass = ''){
  const windowPopup = document.getElementById('homeWindow');
  const windowContent = windowPopup.querySelector('.windowContent');
  const contentContainer = windowPopup.querySelector('#windowInnerContent');

  // Reset previous styles
  windowContent.className = 'windowContent';

  // Add a custom class for styling
  if (customClass){
    windowContent.classList.add(customClass);
  }

  contentContainer.innerHTML = contentHTML;
  windowPopup.style.display = 'block';
  sessionStorage.setItem('windowVisible', 'true');
}

// Example usage
document.getElementById('currRoutineBubble').addEventListener('click', () => {
  showWindow(`
    <section id="currRoutineContent">
      <div class="routineHeader"> 
        <h2>My Current Routine</h2>
        <div id="editRoutineButton">
          <p>edit</p>
          <img src="/static/assets/images/editIcon.png" alt="Edit Icon">
        </div>
      </div>

    </section>
  `, 
    'routineWindow');
});

document.getElementById('goalsBubble').addEventListener('click', () => {
  showWindow(`
    <section id="goalContent"> 
      <h2>My Skincare Goals</h2>
      <div id="goalsContainer">
        <div class="goalBlock">
          <h3>Daily Goals:</h3>
          <div class="goalList">
            <div class="goalItem"><input type="checkbox"> <span contenteditable="true">  </span></div>
          </div>
          <button class="addGoalBtn">+ add daily goal</button>
        </div>
        <div class="goalBlock">
          <h3>Weekly Goals:</h3>
          <div class="goalList">
            <div class="goalItem"><input type="checkbox"> <span contenteditable="true">   </span></div>
          </div>
          <button class="addGoalBtn">+ add weekly goal</button>
        </div>
        <div class="goalBlock">
          <h3>Monthly Goals:</h3>
          <div class="goalList">
            <div class="goalItem"><input type="checkbox"> <span contenteditable="true">   </span></div>
          </div>
          <button class="addGoalBtn">+ add monthly goal</button>
        </div>
      </div>
    </section>
  `, 'goalsWindow');

  // goal removal 
  function enableGoalBehavior() {
    document.querySelectorAll('.goalItem input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked){
          setTimeout(() => {
            checkbox.closest('.goalItem').remove();
          }, 500);
        }
      });
    });
  }
  enableGoalBehavior();

  // adding new goal to edit 
  document.querySelectorAll('.addGoalBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goalList = btn.previousElementSibling;
      const newItem = document.createElement('div');
      newItem.className = 'goalItem';
      newItem.innerHTML = `<input type="checkbox"> <span contenteditable="true">  </span>`;
      goalList.appendChild(newItem);
      enableGoalBehavior();
    });
  });
});
