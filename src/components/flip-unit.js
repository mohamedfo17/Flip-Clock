// Flip Card Digit Component for 3D Split-Flap Animations
import { soundEngine } from '../audio/sound-engine.js';

export class FlipCard {
  constructor(element, initialValue = '0') {
    this.el = element;
    this.currentValue = String(initialValue);
    this.isFlipping = false;
    this.buildDOM();
    this.renderInitial();
  }

  buildDOM() {
    this.el.innerHTML = `
      <div class="card-face top top-static"><div class="card-face-inner">${this.currentValue}</div></div>
      <div class="card-face bottom bottom-static"><div class="card-face-inner">${this.currentValue}</div></div>
      <div class="card-face top top-flip"><div class="card-face-inner">${this.currentValue}</div></div>
      <div class="card-face bottom bottom-flip"><div class="card-face-inner">${this.currentValue}</div></div>
      <div class="flip-card-seam"></div>
    `;

    this.topStatic = this.el.querySelector('.top-static .card-face-inner');
    this.bottomStatic = this.el.querySelector('.bottom-static .card-face-inner');
    this.topFlip = this.el.querySelector('.top-flip .card-face-inner');
    this.bottomFlip = this.el.querySelector('.bottom-flip .card-face-inner');
  }

  renderInitial() {
    this.topStatic.textContent = this.currentValue;
    this.bottomStatic.textContent = this.currentValue;
    this.topFlip.textContent = this.currentValue;
    this.bottomFlip.textContent = this.currentValue;
  }

  setValue(newValue, playAudio = true) {
    const nextStr = String(newValue);
    if (nextStr === this.currentValue) return;

    if (this.isFlipping) {
      // If currently flipping, complete quickly and advance
      this.el.classList.remove('flipping');
      this.currentValue = this.nextPendingValue || this.currentValue;
      this.renderInitial();
      this.isFlipping = false;
    }

    const prevValue = this.currentValue;
    this.currentValue = nextStr;
    this.isFlipping = true;

    // Setup faces for flip physics
    // top-static gets the NEXT value (revealed when top-flip folds down)
    this.topStatic.textContent = nextStr;
    // bottom-static holds OLD value until bottom-flip folds over it
    this.bottomStatic.textContent = prevValue;
    // top-flip holds the OLD value and folds forward
    this.topFlip.textContent = prevValue;
    // bottom-flip holds the NEXT value and folds down onto bottom-static
    this.bottomFlip.textContent = nextStr;

    // Trigger animation
    this.el.classList.add('flipping');
    if (playAudio) {
      soundEngine.playFlap();
    }

    // Reset after animation
    setTimeout(() => {
      this.bottomStatic.textContent = nextStr;
      this.topFlip.textContent = nextStr;
      this.el.classList.remove('flipping');
      this.isFlipping = false;
    }, 450);
  }
}

export class FlipDigitPair {
  constructor(containerElement, initialValue = '00') {
    this.container = containerElement;
    const str = String(initialValue).padStart(2, '0');
    
    const cardEls = this.container.querySelectorAll('.flip-card');
    if (cardEls.length >= 2) {
      this.tensCard = new FlipCard(cardEls[0], str[0]);
      this.unitsCard = new FlipCard(cardEls[1], str[1]);
    }
  }

  setValue(numOrStr, playAudio = true) {
    const str = String(numOrStr).padStart(2, '0');
    this.tensCard.setValue(str[0], playAudio);
    this.unitsCard.setValue(str[1], playAudio);
  }
}
