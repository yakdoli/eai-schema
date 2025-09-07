// Validation Utility
export class ValidationUtil {
  static validateXML(content) {
    try {
      // Simple XML validation - check for matching tags
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
      const tags = [];
      let match;
      
      while ((match = tagRegex.exec(content)) !== null) {
        if (match[0].startsWith('</')) {
          // Closing tag
          const tagName = match[1];
          if (tags.length === 0 || tags.pop() !== tagName) {
            return {
              isValid: false,
              error: `Mismatched closing tag: ${tagName}`
            };
          }
        } else if (!match[0].endsWith('/>')) {
          // Opening tag
          tags.push(match[1]);
        }
      }
      
      if (tags.length > 0) {
        return {
          isValid: false,
          error: `Unclosed tags: ${tags.join(', ')}`
        };
      }
      
      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  static validateJSON(content) {
    try {
      JSON.parse(content);
      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
  
  static validateWSDL(content) {
    // Basic WSDL validation
    const xmlValidation = this.validateXML(content);
    if (!xmlValidation.isValid) {
      return xmlValidation;
    }
    
    // Check for required WSDL elements
    const requiredElements = ['definitions', 'types', 'message', 'portType', 'binding', 'service'];
    const missingElements = [];
    
    for (const element of requiredElements) {
      if (!content.includes(`<${element}`) && !content.includes(`<wsdl:${element}`)) {
        missingElements.push(element);
      }
    }
    
    if (missingElements.length > 0) {
      return {
        isValid: false,
        error: `Missing required WSDL elements: ${missingElements.join(', ')}`
      };
    }
    
    return {
      isValid: true,
      error: null
    };
  }
}