'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faTimes,
  faSpinner,
  faMoneyBillTransfer,
  faClipboardCheck,
  faUserCheck,
  faCircleCheck,
  faExclamationTriangle,
  faHourglassHalf,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { TransactionStatus } from '@/lib/types/database';

interface Step {
  id: string;
  label: string;
  icon: IconDefinition;
  status: 'completed' | 'ongoing' | 'pending' | 'failed' | 'skipped';
  errorMessage?: string;
  timestamp?: string;
}

interface TransactionStatusFlowProps {
  transactionStatus: TransactionStatus;
  requiresApproval: boolean;
  errorMessage?: string;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

export default function TransactionStatusFlow({
  transactionStatus,
  requiresApproval,
  errorMessage,
  createdAt,
  approvedAt,
  completedAt,
}: TransactionStatusFlowProps) {
  // Define all possible steps
  const steps: Step[] = [
    {
      id: 'initiated',
      label: 'Transfer Initiated',
      icon: faMoneyBillTransfer,
      status: 'completed',
      timestamp: createdAt.toISOString(),
    },
    {
      id: 'validated',
      label: 'Validation',
      icon: faClipboardCheck,
      status: transactionStatus === 'FAILED' && errorMessage ? 'failed' : 'completed',
      errorMessage: transactionStatus === 'FAILED' && errorMessage ? errorMessage : undefined,
      timestamp: createdAt.toISOString(),
    },
  ];

  // Add approval step if required
  if (requiresApproval) {
    let approvalStatus: Step['status'] = 'pending';
    let approvalError: string | undefined;

    if (transactionStatus === 'REJECTED') {
      approvalStatus = 'failed';
      approvalError = 'Transfer was rejected by approver';
    } else if (transactionStatus === 'APPROVED' || transactionStatus === 'COMPLETED') {
      approvalStatus = 'completed';
    } else if (transactionStatus === 'AWAITING_APPROVAL') {
      approvalStatus = 'ongoing';
    }

    steps.push({
      id: 'approval',
      label: 'Approval Required',
      icon: faUserCheck,
      status: approvalStatus,
      errorMessage: approvalError,
      timestamp: approvedAt?.toISOString(),
    });
  }

  // Add execution step
  let executionStatus: Step['status'] = 'pending';
  let executionError: string | undefined;

  if (transactionStatus === 'COMPLETED') {
    executionStatus = 'completed';
  } else if (transactionStatus === 'FAILED') {
    executionStatus = 'failed';
    executionError = errorMessage || 'Transfer execution failed';
  } else if (transactionStatus === 'REJECTED') {
    executionStatus = 'skipped';
  } else if (
    transactionStatus === 'APPROVED' ||
    (!requiresApproval && transactionStatus === 'PENDING')
  ) {
    executionStatus = 'ongoing';
  }

  steps.push({
    id: 'execution',
    label: 'Transfer Execution',
    icon: faHourglassHalf,
    status: executionStatus,
    errorMessage: executionError,
    timestamp: completedAt?.toISOString(),
  });

  // Add completion step
  let completionStatus: Step['status'] = 'pending';
  if (transactionStatus === 'COMPLETED') {
    completionStatus = 'completed';
  } else if (transactionStatus === 'FAILED' || transactionStatus === 'REJECTED') {
    completionStatus = 'skipped';
  }

  steps.push({
    id: 'completed',
    label: 'Transfer Complete',
    icon: faCircleCheck,
    status: completionStatus,
    timestamp: completedAt?.toISOString(),
  });

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <div
        className={`p-4 rounded-lg ${
          transactionStatus === 'COMPLETED'
            ? 'bg-green-50 border-2 border-green-500'
            : transactionStatus === 'FAILED' || transactionStatus === 'REJECTED'
            ? 'bg-red-50 border-2 border-red-500'
            : transactionStatus === 'AWAITING_APPROVAL'
            ? 'bg-yellow-50 border-2 border-yellow-500'
            : 'bg-blue-50 border-2 border-blue-500'
        }`}
      >
        <div className="flex items-center gap-3">
          {transactionStatus === 'COMPLETED' && (
            <>
              <FontAwesomeIcon icon={faCircleCheck} className="text-green-600 text-2xl" />
              <div>
                <h3 className="font-semibold text-green-900">Transfer Completed Successfully</h3>
                <p className="text-sm text-green-700">
                  All steps completed. Funds have been transferred.
                </p>
              </div>
            </>
          )}
          {(transactionStatus === 'FAILED' || transactionStatus === 'REJECTED') && (
            <>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-2xl" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Transfer {transactionStatus === 'REJECTED' ? 'Rejected' : 'Failed'}
                </h3>
                <p className="text-sm text-red-700">
                  {errorMessage || 'The transfer could not be completed.'}
                </p>
              </div>
            </>
          )}
          {transactionStatus === 'AWAITING_APPROVAL' && (
            <>
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-yellow-600 text-2xl animate-spin"
              />
              <div>
                <h3 className="font-semibold text-yellow-900">Awaiting Approval</h3>
                <p className="text-sm text-yellow-700">
                  This transfer requires approval before execution.
                </p>
              </div>
            </>
          )}
          {transactionStatus === 'PENDING' && (
            <>
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-blue-600 text-2xl animate-spin"
              />
              <div>
                <h3 className="font-semibold text-blue-900">Transfer In Progress</h3>
                <p className="text-sm text-blue-700">Processing your transfer...</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Step-by-Step Flow */}
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-8 top-16 w-0.5 h-16 ${
                  steps[index + 1].status === 'completed'
                    ? 'bg-green-500'
                    : steps[index + 1].status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              />
            )}

            {/* Step Card */}
            <div className="flex items-start gap-4 mb-4">
              {/* Icon Circle */}
              <div
                className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                  step.status === 'completed'
                    ? 'bg-green-100 border-green-500'
                    : step.status === 'failed'
                    ? 'bg-red-100 border-red-500'
                    : step.status === 'ongoing'
                    ? 'bg-blue-100 border-blue-500'
                    : step.status === 'skipped'
                    ? 'bg-gray-100 border-gray-400'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                {step.status === 'completed' && (
                  <FontAwesomeIcon icon={faCheck} className="text-green-600 text-xl" />
                )}
                {step.status === 'failed' && (
                  <FontAwesomeIcon icon={faTimes} className="text-red-600 text-xl" />
                )}
                {step.status === 'ongoing' && (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="text-blue-600 text-xl animate-spin"
                  />
                )}
                {step.status === 'pending' && (
                  <FontAwesomeIcon icon={step.icon} className="text-gray-400 text-xl" />
                )}
                {step.status === 'skipped' && (
                  <FontAwesomeIcon icon={step.icon} className="text-gray-400 text-xl" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-grow pt-2">
                <div
                  className={`p-4 rounded-lg border-2 ${
                    step.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : step.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : step.status === 'ongoing'
                      ? 'bg-blue-50 border-blue-200'
                      : step.status === 'skipped'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-semibold ${
                        step.status === 'completed'
                          ? 'text-green-900'
                          : step.status === 'failed'
                          ? 'text-red-900'
                          : step.status === 'ongoing'
                          ? 'text-blue-900'
                          : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {step.timestamp && step.status === 'completed' && (
                      <span className="text-xs text-gray-500">
                        {new Date(step.timestamp).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {step.status === 'completed' && (
                    <p className="text-sm text-green-700 mt-1">✓ Completed successfully</p>
                  )}
                  {step.status === 'failed' && step.errorMessage && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                      <p className="text-sm text-red-800 font-medium">Error:</p>
                      <p className="text-sm text-red-700">{step.errorMessage}</p>
                    </div>
                  )}
                  {step.status === 'ongoing' && (
                    <p className="text-sm text-blue-700 mt-1">⏳ In progress...</p>
                  )}
                  {step.status === 'pending' && (
                    <p className="text-sm text-gray-500 mt-1">⏸ Waiting to start</p>
                  )}
                  {step.status === 'skipped' && (
                    <p className="text-sm text-gray-500 mt-1">⊘ Skipped</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
