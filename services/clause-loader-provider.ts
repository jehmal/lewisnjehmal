/**
 * This provider helps avoid circular dependencies between clause-loader.ts and reference-loader.ts
 */

// Type for a lazy-loaded clause loader getter
type ClauseLoaderGetter = () => any; // 'any' here to avoid needing to import ClauseLoader type

// The provider object
class ClauseLoaderProvider {
  private getterFunction: ClauseLoaderGetter | null = null;
  private debug = false; // Debug mode flag
  
  // Register the getter function - called by clause-loader.ts
  public registerClauseLoader(getter: ClauseLoaderGetter): void {
    this.getterFunction = getter;
    console.log('ClauseLoader has been registered');
  }
  
  // Get the clause loader - called by reference-loader.ts
  public getClauseLoader(): any {
    if (!this.getterFunction) {
      // This shouldn't happen in normal operation
      console.error('ClauseLoader has not been registered yet');
      throw new Error('ClauseLoader not registered');
    }
    
    return this.getterFunction();
  }
  
  // Enable debug mode - useful for troubleshooting standards loading
  public enableDebug(enabled: boolean = true): void {
    this.debug = enabled;
    console.log(`ClauseLoaderProvider debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Check if a standard is supported
  public isStandardSupported(standardId: string): boolean {
    try {
      const loader = this.getClauseLoader();
      
      // Normalize standard ID first
      let normalizedId = standardId
        .replace(/-(19|20)\d\d$/, '') // Remove year suffix
        .replace(/^(AS|NZS|ASNZS|AS\/NZS)\s*/, ''); // Remove standard prefix
      
      // Special case for 4777.1
      if (normalizedId === '4777' || normalizedId === '4777.1') {
        if (this.debug) {
          console.log(`Standard ${standardId} is supported via 4777.1 mapping`);
        }
        return true;
      }
      
      const isSupported = loader && 
                         loader.standardModules && 
                         !!loader.standardModules[normalizedId];
      
      if (this.debug) {
        console.log(`Standard ${standardId} (normalized: ${normalizedId}) support check: ${isSupported}`);
      }
      
      return isSupported;
    } catch (err) {
      console.error(`Error checking if standard ${standardId} is supported:`, err);
      return false;
    }
  }
}

// Export a singleton instance
export const clauseLoaderProvider = new ClauseLoaderProvider(); 