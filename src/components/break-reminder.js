// Micro-Break & Posture Alert Component

export class BreakReminder {
  constructor(overlayElement, onDismiss = () => {}) {
    this.overlay = overlayElement;
    this.onDismiss = onDismiss;
    this.tips = [
      {
        icon: '👀',
        title: '20-20-20 Eye Rest Rule',
        desc: 'Rest your eyes from screen glare: look at an object at least 20 feet away for 20 seconds to relax your optic focusing muscles.'
      },
      {
        icon: '🧘',
        title: 'Spine & Shoulder Alignment',
        desc: 'Stand up or sit tall. Roll your shoulders back and down 5 times, then gently tilt your head side to side to relieve upper back tension.'
      },
      {
        icon: '💧',
        title: 'Hydration Refresh',
        desc: 'Step away from the screen and drink a full glass of cool water. Even mild 1% dehydration drops working memory and concentration.'
      },
      {
        icon: '🤲',
        title: 'Wrist & Finger Release',
        desc: 'Extend both arms forward. Gently pull fingers back toward your wrist for 10 seconds, then shake out your hands to prevent repetitive strain.'
      },
      {
        icon: '🌬️',
        title: 'Deep Box Breathing',
        desc: 'Calm your nervous system: Inhale slowly for 4s, hold for 4s, exhale completely for 4s, hold empty for 4s. Repeat twice.'
      }
    ];
    this.tipIndex = 0;
  }

  show() {
    const tip = this.tips[this.tipIndex];
    this.tipIndex = (this.tipIndex + 1) % this.tips.length;

    const iconEl = this.overlay.querySelector('.break-icon-wrap');
    const titleEl = this.overlay.querySelector('.break-modal-title');
    const descEl = this.overlay.querySelector('.break-modal-desc');

    if (iconEl) iconEl.textContent = tip.icon;
    if (titleEl) titleEl.textContent = tip.title;
    if (descEl) descEl.textContent = tip.desc;

    this.overlay.classList.add('visible');
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.onDismiss();
  }
}
