import {Component, inject, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '@services/auth.service';

/**
 * Login-Formular unter '/login'. Erfolgreiche Anmeldung führt zur Startseite.
 */
@Component( {
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatFormField, MatLabel, MatInput, MatButtonModule, MatCardModule],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.scss']
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Login-Form (Identifier = E-Mail oder Benutzername)
  form = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });

  error = '';
  public nameCtrl = new FormControl();
  public pwdCtrl = new FormControl();

  // Register-Flow
  registerMode = false;
  registerStep = 1; // 1: email, 2: username, 3: password
  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordRepeat: ['', [Validators.required, Validators.minLength(6)]],
  });

  /**
   * Validiert die Eingaben und wechselt bei Erfolg zur Startseite '/'.
   */
  async submit(): Promise<void> {
    this.error = '';
    const { identifier, password } = this.form.value;
    const ok = await this.auth.login(identifier ?? '', password ?? '');
    if (ok) {
      this.router.navigate(['/']).then();
    } else {
      this.error = 'Ungültige Zugangsdaten';
    }
  }

  /**
   * Ist der Nutzer bereits angemeldet, wird direkt zur Startseite navigiert.
   */
  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']).then();
    }
  }

  toggleRegister(): void {
    this.registerMode = !this.registerMode;
    this.registerStep = 1;
    this.error = '';
  }

  nextStep(): void {
    if (this.registerStep === 1 && this.registerForm.get('email')?.invalid) return;
    if (this.registerStep === 2 && this.registerForm.get('username')?.invalid) return;
    if (this.registerStep < 3) this.registerStep++;
  }

  prevStep(): void {
    if (this.registerStep > 1) this.registerStep--;
  }

  async submitRegister(): Promise<void> {
    this.error = '';
    const { email, username, password, passwordRepeat } = this.registerForm.value;
    if ((password ?? '') !== (passwordRepeat ?? '')) {
      this.error = 'Passwörter stimmen nicht überein';
      return;
    }
    const ok = await this.auth.register(email ?? '', username ?? '', password ?? '');
    if (ok) {
      this.router.navigate(['/']).then();
    } else {
      this.error = 'Registrierung fehlgeschlagen';
    }
  }
}
