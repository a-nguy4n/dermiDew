
const track = document.querySelector(".cardTrack");
const cards = document.querySelectorAll(".workCard");
const cardView = document.querySelector(".cardView");
const dots = document.querySelectorAll(".dot");

const cardWidth = cards[0].offsetWidth + parseFloat(getComputedStyle(cards[0]).marginRight);
const visibleCards = 3;

let index = visibleCards;

for (let i = 0; i < visibleCards; i++){
  const firstClone = cards[i].cloneNode(true);
  const lastClone = cards[cards.length - 1 - i].cloneNode(true);
  track.appendChild(firstClone);
  track.insertBefore(lastClone, track.firstChild);
}

const allCards = document.querySelectorAll(".workCard");
track.style.transform = `translateX(-${index * cardWidth}px)`;

function updatePosition(){
  track.style.transition = "transform 0.4s ease";
  track.style.transform = `translateX(-${index * cardWidth}px)`;
  updateDots();
}

function resetPosition(newIndex){a
  track.style.transition = "none";
  track.style.transform = `translateX(-${newIndex * cardWidth}px)`;
  index = newIndex;
  updateDots();
}

function updateDots(){
  const logicalIndex = (index - visibleCards) % (cards.length - visibleCards + 1);
  const activeDot = logicalIndex < 0 ? logicalIndex + dots.length : logicalIndex;

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === activeDot);
  });
}

document.getElementById("rightArrow").addEventListener("click", () => {
  index++;
  updatePosition();

  if (index === allCards.length - visibleCards) {
    setTimeout(() => {
      resetPosition(visibleCards);
    }, 400);
  }
});

document.getElementById("leftArrow").addEventListener("click", () => {
  index--;
  updatePosition();

  if (index === 0){
    setTimeout(() => {
      resetPosition(allCards.length - (visibleCards * 2));
    }, 400);
  }
});

updateDots();