# src/models.py
from pydantic import BaseModel, Field
from typing import Optional, Any, List
from enum import Enum


class FailureCategory(str, Enum):
    AUTH_ERROR = "AUTH_ERROR"
    RATE_LIMIT = "RATE_LIMIT"
    SCHEMA_CHANGE = "SCHEMA_CHANGE"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT = "TIMEOUT"
    DATA_VALIDATION = "DATA_VALIDATION"
    CONFIGURATION = "CONFIGURATION"
    THIRD_PARTY_OUTAGE = "THIRD_PARTY_OUTAGE"
    UNKNOWN = "UNKNOWN"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ExecutionStep(BaseModel):
    stepName: str
    stepIndex: int
    status: str
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    durationMs: Optional[int] = None


class AnalyzeRequest(BaseModel):
    executionId: str
    workflowName: str
    workflowSource: str
    status: str
    errorMessage: Optional[str] = None
    rawLogs: Optional[str] = None
    inputPayload: Optional[Any] = None
    outputData: Optional[Any] = None
    steps: Optional[List[ExecutionStep]] = None


class Fix(BaseModel):
    priority: int
    title: str
    description: str
    automated: bool = False


class BusinessImpact(BaseModel):
    type: str
    description: str
    count: Optional[int] = None
    estimatedRevenueLoss: Optional[float] = None


class AnalyzeResponse(BaseModel):
    root_cause: str
    explanation: str
    technical_details: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    severity: Severity
    category: FailureCategory
    suggested_fixes: List[Fix]
    business_impact: Optional[BusinessImpact] = None
    similar_failures: Optional[List[str]] = None


class HealRequest(BaseModel):
    executionId: str
    category: FailureCategory
    rootCause: str
    suggestedFixes: List[Any]
    workflowConfig: Optional[Any] = None


class HealResponse(BaseModel):
    success: bool
    log: str
    actions: List[str]


class ExecutionSummary(BaseModel):
    id: str
    status: str
    startedAt: str
    durationMs: Optional[int] = None
    errorMessage: Optional[str] = None
    category: Optional[str] = None


class PredictRequest(BaseModel):
    workflowId: str
    executions: List[ExecutionSummary]


class RiskFactor(BaseModel):
    factor: str
    impact: float
    description: str


class PredictResponse(BaseModel):
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_level: str
    explanation: str
    factors: List[RiskFactor]
    predicted_failure_window: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[Any] = None
    orgId: Optional[str] = None
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None
