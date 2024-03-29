import { $path } from "@ignisda/remix-routes";
import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import {
	AddEntityToCollectionDocument,
	CommitMediaDocument,
	CreateReviewCommentDocument,
	DeleteReviewDocument,
	EntityLot,
	MetadataLot,
	MetadataSource,
	PostReviewDocument,
	RemoveEntityFromCollectionDocument,
	Visibility,
} from "@ryot/generated/graphql/backend/graphql";
import { namedAction } from "remix-utils/named-action";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zx } from "zodix";
import { getAuthorizationHeader, gqlClient } from "~/lib/api.server";
import { colorSchemeCookie } from "~/lib/cookies.server";
import { createToastHeaders } from "~/lib/toast.server";
import {
	MetadataSpecificsSchema,
	getLogoutCookies,
	processSubmission,
} from "~/lib/utilities.server";

export const loader = async () => redirect($path("/"));

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.clone().formData();
	return namedAction(request, {
		commitMedia: async () => {
			const submission = processSubmission(formData, commitMediaSchema);
			const { commitMedia } = await gqlClient.request(
				CommitMediaDocument,
				submission,
				await getAuthorizationHeader(request),
			);
			return json({ status: "success", submission, commitMedia } as const);
		},
		toggleColorScheme: async () => {
			const currentColorScheme = await colorSchemeCookie.parse(
				request.headers.get("Cookie") || "",
			);
			const newColorScheme = currentColorScheme === "dark" ? "light" : "dark";
			return json(
				{},
				{
					headers: {
						"Set-Cookie": await colorSchemeCookie.serialize(newColorScheme),
					},
				},
			);
		},
		logout: async () => {
			return redirect($path("/auth/login"), {
				headers: {
					"Set-Cookie": await getLogoutCookies(),
				},
			});
		},
		createReviewComment: async () => {
			const submission = processSubmission(formData, reviewCommentSchema);
			await gqlClient.request(
				CreateReviewCommentDocument,
				{ input: submission },
				await getAuthorizationHeader(request),
			);
			return json({ status: "success", submission } as const, {
				headers: await createToastHeaders({
					message:
						submission.incrementLikes || submission.decrementLikes
							? "Score changed successfully"
							: `Comment ${
									submission.shouldDelete ? "deleted" : "posted"
							  } successfully`,
					type: "success",
				}),
			});
		},
		addEntityToCollection: async () => {
			const submission = processSubmission(
				formData,
				changeCollectionToEntitySchema,
			);
			await gqlClient.request(
				AddEntityToCollectionDocument,
				{ input: submission },
				await getAuthorizationHeader(request),
			);
			return json({ status: "success", submission } as const, {
				headers: await createToastHeaders({
					message: "Media added to collection successfully",
					type: "success",
				}),
			});
		},
		removeEntityFromCollection: async () => {
			const submission = processSubmission(
				formData,
				changeCollectionToEntitySchema,
			);
			await gqlClient.request(
				RemoveEntityFromCollectionDocument,
				{ input: submission },
				await getAuthorizationHeader(request),
			);
			return json({ status: "success", submission } as const);
		},
		performReviewAction: async () => {
			const submission = processSubmission(formData, reviewSchema);
			if (submission.shouldDelete) {
				invariant(submission.reviewId, "No reviewId provided");
				await gqlClient.request(
					DeleteReviewDocument,
					{ reviewId: submission.reviewId },
					await getAuthorizationHeader(request),
				);
				return json({ status: "success", submission } as const, {
					headers: await createToastHeaders({
						message: "Review deleted successfully",
						type: "success",
					}),
				});
			}
			await gqlClient.request(
				PostReviewDocument,
				{ input: submission },
				await getAuthorizationHeader(request),
			);
			return json({ status: "success", submission } as const, {
				headers: await createToastHeaders({
					message: "Review submitted successfully",
					type: "success",
				}),
			});
		},
	});
};

const commitMediaSchema = z.object({
	identifier: z.string(),
	lot: z.nativeEnum(MetadataLot),
	source: z.nativeEnum(MetadataSource),
});

const reviewCommentSchema = z.object({
	reviewId: zx.IntAsString,
	commentId: z.string().optional(),
	text: z.string().optional(),
	decrementLikes: zx.BoolAsString.optional(),
	incrementLikes: zx.BoolAsString.optional(),
	shouldDelete: zx.BoolAsString.optional(),
});

const changeCollectionToEntitySchema = z.object({
	collectionName: z.string(),
	entityId: z.string(),
	entityLot: z.nativeEnum(EntityLot),
});

const reviewSchema = z
	.object({
		shouldDelete: zx.BoolAsString.optional(),
		rating: z.string().optional(),
		text: z.string().optional(),
		visibility: z.nativeEnum(Visibility).optional(),
		spoiler: zx.CheckboxAsString.optional(),
		metadataId: zx.IntAsString.optional(),
		metadataGroupId: zx.IntAsString.optional(),
		collectionId: zx.IntAsString.optional(),
		personId: zx.IntAsString.optional(),
		reviewId: zx.IntAsString.optional(),
	})
	.merge(MetadataSpecificsSchema);
