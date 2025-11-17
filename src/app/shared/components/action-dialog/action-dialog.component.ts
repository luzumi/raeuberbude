import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { IntentActionService, ActionResult } from '../../../core/services/intent-action.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-action-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-dialog-overlay" *ngIf="show" (click)="close()">
      <div class="action-dialog" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="dialog-header">
          <h2>{{ dialogContent?.title || 'Information' }}</h2>
          <button class="close-btn" (click)="close()" title="Schließen">✕</button>
        </div>

        <!-- Content -->
        <div class="dialog-content" [class]="dialogContent?.type" [class.loading]="dialogContent?.isLoading">
          <div [innerHTML]="safeHtml"></div>

          <!-- Links (für Web-Suche) -->
          <div class="action-links" *ngIf="dialogContent &&dialogContent?.links && dialogContent?.links?.length > 0">
            <a *ngFor="let link of dialogContent.links"
               [href]="link.url"
               target="_blank"
               rel="noopener noreferrer"
               class="action-link">
              {{ link.title }}
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <button class="btn-primary" (click)="close()">OK</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .action-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .action-dialog {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5em;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 28px;
      color: #999;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    /* Typ-spezifisches Styling */
    .dialog-content.ha_command {
      background: #e8f5e9;
    }

    .dialog-content.ha_query {
      background: #e3f2fd;
    }

    .dialog-content.web_search {
      background: #fff3e0;
    }

    .dialog-content.greeting,
    .dialog-content.general {
      background: #f5f5f5;
    }

    /* Content Elemente */
    .dialog-content h3 {
      margin-top: 0;
      color: #333;
    }

    .dialog-content .keywords {
      margin: 10px 0;
      padding: 10px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 6px;
      font-size: 0.9em;
    }

    .dialog-content .detected-entities {
      margin: 15px 0;
      padding: 15px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 6px;
    }

    .dialog-content .detected-entities ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
    }

    .dialog-content .detected-entities li {
      margin: 5px 0;
    }

    .dialog-content code {
      background: rgba(0, 0, 0, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .dialog-content .note {
      margin-top: 15px;
      padding: 10px;
      background: rgba(33, 150, 243, 0.1);
      border-left: 3px solid #2196f3;
      font-size: 0.9em;
      color: #555;
    }

    /* Action Links */
    .action-links {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .action-link {
      display: block;
      padding: 12px 20px;
      background: #2196f3;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      text-align: center;
      font-weight: 500;
      transition: all 0.2s;
    }

    .action-link:hover {
      background: #1976d2;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    /* Footer */
    .dialog-footer {
      padding: 15px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
      border: none;
      padding: 10px 30px;
      border-radius: 6px;
      font-size: 1em;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #1976d2;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 30px 20px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      margin: 0 auto 20px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-state .transcript {
      font-size: 1.1em;
      font-weight: 600;
      color: #333;
      margin: 15px 0;
      font-style: italic;
    }

    .loading-state .status {
      color: #666;
      font-size: 0.9em;
      animation: pulse-text 1.5s ease-in-out infinite;
    }

    @keyframes pulse-text {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    .dialog-content.loading {
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .action-dialog {
        width: 95%;
        max-height: 90vh;
      }

      .dialog-header {
        padding: 15px;
      }

      .dialog-header h2 {
        font-size: 1.2em;
      }

      .dialog-content {
        padding: 15px;
      }

      .spinner {
        width: 40px;
        height: 40px;
      }
    }
  `]
})
export class ActionDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  show = false;
  dialogContent?: ActionResult['dialogContent'];
  safeHtml: SafeHtml = '';

  constructor(
    private readonly intentActionService: IntentActionService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.intentActionService.actionResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result.showDialog && result.dialogContent) {
          if (this.show && result.isLoading === false) {
            // Update existing dialog
            this.update(result.dialogContent);
          } else {
            // Open new dialog
            this.open(result.dialogContent);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  open(content: ActionResult['dialogContent']): void {
    this.dialogContent = content;
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(content?.content || '');
    this.show = true;
  }

  update(content: ActionResult['dialogContent']): void {
    this.dialogContent = content;
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(content?.content || '');
  }

  close(): void {
    this.show = false;
    setTimeout(() => {
      this.dialogContent = undefined;
      this.safeHtml = '';
    }, 300); // Nach Animation
  }
}
