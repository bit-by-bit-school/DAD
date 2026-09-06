package models

import (
	"time"
)

type User struct {
	ID              string    `gorm:"primaryKey;column:id" json:"id"`
	Username        string    `gorm:"uniqueIndex;column:username;not null" json:"username"`
	Token           string    `gorm:"uniqueIndex;column:token;not null" json:"token"`
	DiscordID       *string   `gorm:"uniqueIndex;column:discordId" json:"discordId,omitempty"`
	DiscordUsername *string   `gorm:"column:discordUsername" json:"discordUsername,omitempty"`
	DiscordAvatar   *string   `gorm:"column:discordAvatar" json:"discordAvatar,omitempty"`
	Role            string    `gorm:"column:role;default:USER" json:"role"`
	CreatedAt       time.Time `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt;autoUpdateTime" json:"updatedAt"`

	Solutions []Solution `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"solutions,omitempty"`
	Ratings   []Rating   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"ratings,omitempty"`
	Comments  []Comment  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"comments,omitempty"`
}

func (User) TableName() string {
	return "User"
}

type UserSummary struct {
	ID            string  `json:"id"`
	Username      string  `json:"username"`
	DiscordAvatar *string `json:"discordAvatar,omitempty"`
	Role          string  `json:"role"`
}

type UserWithCount struct {
	UserSummary
	Count struct {
		Solutions int `json:"solutions"`
	} `json:"_count"`
}

type UserAdminSummary struct {
	ID              string    `json:"id"`
	Username        string    `json:"username"`
	Token           string    `json:"token"`
	DiscordID       *string   `json:"discordId,omitempty"`
	DiscordUsername *string   `json:"discordUsername,omitempty"`
	DiscordAvatar   *string   `json:"discordAvatar,omitempty"`
	Role            string    `json:"role"`
	CreatedAt       time.Time `json:"createdAt"`
	Count           struct {
		Solutions int `json:"solutions"`
		Comments  int `json:"comments"`
		Ratings   int `json:"ratings"`
	} `json:"_count"`
}

type UnmappedDiscord struct {
	ID              string    `gorm:"primaryKey;column:id" json:"id"`
	DiscordID       string    `gorm:"uniqueIndex;column:discordId;not null" json:"discordId"`
	DiscordUsername string    `gorm:"column:discordUsername;not null" json:"discordUsername"`
	DiscordAvatar   *string   `gorm:"column:discordAvatar" json:"discordAvatar,omitempty"`
	LoggedInAt      time.Time `gorm:"column:loggedInAt;autoCreateTime" json:"loggedInAt"`
}

func (UnmappedDiscord) TableName() string {
	return "UnmappedDiscord"
}

type Solution struct {
	ID             string     `gorm:"primaryKey;column:id" json:"id"`
	SubmissionID   string     `gorm:"column:submissionId;not null" json:"submissionId"`
	Platform       string     `gorm:"column:platform;default:hackerrank" json:"platform"`
	ChallengeSlug  string     `gorm:"column:challengeSlug;not null" json:"challengeSlug"`
	ChallengeTitle string     `gorm:"column:challengeTitle;not null" json:"challengeTitle"`
	ContestSlug    *string    `gorm:"column:contestSlug;default:master" json:"contestSlug,omitempty"`
	Language       string     `gorm:"column:language;not null" json:"language"`
	Code           string     `gorm:"column:code;not null" json:"code"`
	Score          *float64   `gorm:"column:score" json:"score,omitempty"`
	Status         *string    `gorm:"column:status" json:"status,omitempty"`
	SubmittedAt    *time.Time `gorm:"column:submittedAt" json:"submittedAt,omitempty"`
	UserID         string     `gorm:"column:userId;not null" json:"userId"`
	CreatedAt      time.Time  `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`
	UpdatedAt      time.Time  `gorm:"column:updatedAt;autoUpdateTime" json:"updatedAt"`

	User         User          `gorm:"foreignKey:UserID;references:ID" json:"user"`
	Ratings      []Rating      `gorm:"foreignKey:SolutionID;constraint:OnDelete:CASCADE" json:"ratings,omitempty"`
	Comments     []Comment     `gorm:"foreignKey:SolutionID;constraint:OnDelete:CASCADE" json:"comments,omitempty"`
	ReviewRounds []ReviewRound `gorm:"foreignKey:SolutionID;constraint:OnDelete:CASCADE" json:"reviewRounds,omitempty"`
}

func (Solution) TableName() string {
	return "Solution"
}

type Rating struct {
	ID         string    `gorm:"primaryKey;column:id" json:"id"`
	SolutionID string    `gorm:"column:solutionId;not null;uniqueIndex:idx_solution_user" json:"solutionId"`
	UserID     string    `gorm:"column:userId;not null;uniqueIndex:idx_solution_user" json:"userId"`
	Cleverness int       `gorm:"column:cleverness;not null" json:"cleverness"`
	Readability int      `gorm:"column:readability;not null" json:"readability"`
	CreatedAt  time.Time `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt;autoUpdateTime" json:"updatedAt"`

	User     User     `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Solution Solution `gorm:"foreignKey:SolutionID;references:ID" json:"solution,omitempty"`
}

func (Rating) TableName() string {
	return "Rating"
}

type Comment struct {
	ID          string    `gorm:"primaryKey;column:id" json:"id"`
	SolutionID  string    `gorm:"column:solutionId;not null" json:"solutionId"`
	UserID      string    `gorm:"column:userId;not null" json:"userId"`
	Content     string    `gorm:"column:content;not null" json:"content"`
	StartLine   *int      `gorm:"column:startLine" json:"startLine,omitempty"`
	EndLine     *int      `gorm:"column:endLine" json:"endLine,omitempty"`
	CommentType string    `gorm:"column:commentType;default:GENERAL" json:"commentType"`
	CreatedAt   time.Time `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt;autoUpdateTime" json:"updatedAt"`

	User     User     `gorm:"foreignKey:UserID;references:ID" json:"user"`
	Solution Solution `gorm:"foreignKey:SolutionID;references:ID" json:"solution,omitempty"`
}

func (Comment) TableName() string {
	return "Comment"
}

type ReviewRound struct {
	ID          string    `gorm:"primaryKey;column:id" json:"id"`
	SolutionID  string    `gorm:"column:solutionId;not null;uniqueIndex:idx_sol_round" json:"solutionId"`
	RoundNumber int       `gorm:"column:roundNumber;not null;uniqueIndex:idx_sol_round" json:"roundNumber"`
	ReviewerID  string    `gorm:"column:reviewerId;not null" json:"reviewerId"`
	Status      string    `gorm:"column:status;default:APPROVED" json:"status"`
	GeminiDraft *string   `gorm:"column:geminiDraft" json:"geminiDraft,omitempty"`
	AdminNotes  string    `gorm:"column:adminNotes;not null" json:"adminNotes"`
	CreatedAt   time.Time `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt;autoUpdateTime" json:"updatedAt"`

	Reviewer User     `gorm:"foreignKey:ReviewerID;references:ID" json:"reviewer"`
	Solution Solution `gorm:"foreignKey:SolutionID;references:ID" json:"solution,omitempty"`
}

func (ReviewRound) TableName() string {
	return "ReviewRound"
}

type Notification struct {
	ID         string    `gorm:"primaryKey;column:id" json:"id"`
	UserID     string    `gorm:"column:userId;not null" json:"userId"`
	ActorID    *string   `gorm:"column:actorId" json:"actorId,omitempty"`
	SolutionID string    `gorm:"column:solutionId;not null" json:"solutionId"`
	Type       string    `gorm:"column:type;not null" json:"type"`
	Message    string    `gorm:"column:message;not null" json:"message"`
	IsRead     bool      `gorm:"column:isRead;default:false" json:"isRead"`
	CreatedAt  time.Time `gorm:"column:createdAt;autoCreateTime" json:"createdAt"`

	User     User     `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Actor    *User    `gorm:"foreignKey:ActorID;references:ID" json:"actor,omitempty"`
	Solution Solution `gorm:"foreignKey:SolutionID;references:ID" json:"solution,omitempty"`
}

func (Notification) TableName() string {
	return "Notification"
}
