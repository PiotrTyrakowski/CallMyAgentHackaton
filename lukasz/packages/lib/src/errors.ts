export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

export class NetworkError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'NETWORK', 0, options);
  }
}

export class BackendError extends AppError {
  constructor(message: string, statusCode: number, options?: ErrorOptions) {
    super(message, 'BACKEND', statusCode, options);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[] | undefined>,
    options?: ErrorOptions
  ) {
    super(message, 'VALIDATION', 400, options);
  }
}

export class CallFailedError extends AppError {
  constructor(
    public readonly offerId: string,
    reason: string,
    options?: ErrorOptions
  ) {
    super(`Call to host of offer ${offerId} failed: ${reason}`, 'CALL_FAILED', 0, options);
  }
}

export class BookingFailedError extends AppError {
  constructor(
    public readonly offerId: string,
    reason: string,
    options?: ErrorOptions
  ) {
    super(`Booking offer ${offerId} failed: ${reason}`, 'BOOKING_FAILED', 0, options);
  }
}
