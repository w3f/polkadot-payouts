export const getErrorMessage = (error: unknown): string => {
  let errorString: string
  if (typeof error === "string") {
    errorString = error
  } else if (error instanceof Error) {
    errorString = error.message 
  }
  return errorString
}

export const delay = (ms: number): Promise<void> =>{
  return new Promise( resolve => setTimeout(resolve, ms) );
}