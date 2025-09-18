export class Tools {
  /**
   * Sleep promise
   */
  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
