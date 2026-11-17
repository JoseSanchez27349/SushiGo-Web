import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private synthesis = window.speechSynthesis;
  private isSpeaking = false;

  constructor() {
    // Pre-cargar las voces para evitar retrasos
    this.synthesis.getVoices();
  }

  /**
   * Hace que el asistente "hable".
   * @param text El mensaje que dirá la IA.
   * @param urgent Si es true, hablará más rápido y con tono de alerta.
   */
  speak(text: string, urgent: boolean = false): void {
    if (!this.synthesis) {
      console.warn('La síntesis de voz no está soportada en este navegador.');
      return;
    }

    // Si ya está hablando, lo detenemos para que no se encimen los mensajes
    if (this.isSpeaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuración de la voz (Español)
    utterance.lang = 'es-MX'; 
    utterance.pitch = urgent ? 1.2 : 1; // Tono más agudo si es urgente
    utterance.rate = urgent ? 1.1 : 0.95; // Habla un poco más rápido si es urgente
    utterance.volume = 1; // Volumen máximo

    // Intentar buscar una voz en español automáticamente
    const voices = this.synthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.includes('es-MX') || v.lang.includes('es-ES'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => this.isSpeaking = true;
    utterance.onend = () => this.isSpeaking = false;
    utterance.onerror = () => this.isSpeaking = false;

    this.synthesis.speak(utterance);
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }
}