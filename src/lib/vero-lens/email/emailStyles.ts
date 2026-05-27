export const emailStyles = {
    container: "font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;",
    header: "text-align: center; margin-bottom: 30px;",
    title: "color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;",
    text: "color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;",
    buttonContainer: "text-align: center; margin-bottom: 30px; margin-top: 20px;",
    buttonPrimary: "display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 700; border-radius: 8px;",
    hr: "border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;",
    footerText: "color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;",
    highlightBox: "background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;",
    highlightTitle: "color: #4b5563; font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;",
    highlightText: "color: #111827; font-size: 16px; font-weight: 500; margin: 8px 0 0 0;",
    quoteMessage: "background-color: #f9fafb; padding: 15px; border-left: 4px solid #4f46e5; margin-bottom: 24px; border-radius: 4px; font-style: italic; color: #374151;"
};

export function wrapEmail(content: string, businessName: string) {
    return `
        <div style="${emailStyles.container}">
            <div style="${emailStyles.header}">
                <h1 style="color: #111827; font-size: 20px; margin: 0;">${businessName}</h1>
            </div>
            ${content}
            <hr style="${emailStyles.hr}">
            <p style="${emailStyles.footerText}">
                This notification was sent via Verihub on behalf of ${businessName}.
            </p>
        </div>
    `;
}
