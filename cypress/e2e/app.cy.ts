describe('Government Billing Solution', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('should display the home page', () => {
        cy.contains('Government Billing Solution')
        cy.get('ion-content').should('be.visible')
    })

    it('should allow navigation', () => {
        // Test basic navigation
        cy.get('ion-menu-button').should('be.visible')
    })

    it('should be responsive', () => {
        // Test mobile viewport
        cy.viewport(375, 667)
        cy.get('ion-content').should('be.visible')

        // Test tablet viewport
        cy.viewport(768, 1024)
        cy.get('ion-content').should('be.visible')

        // Test desktop viewport
        cy.viewport(1280, 720)
        cy.get('ion-content').should('be.visible')
    })
})
