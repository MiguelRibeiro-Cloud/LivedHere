"""Remove personal data left by previously soft-deleted accounts.

Revision ID: 202609260001
Revises: 202602210001
"""

from alembic import op


revision = "202609260001"
down_revision = "202602210001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM magic_link_tokens
        WHERE email IN (SELECT email FROM users WHERE deleted_at IS NOT NULL)
        """
    )
    op.execute("DELETE FROM users WHERE deleted_at IS NOT NULL")


def downgrade() -> None:
    # Deleted personal data cannot be restored by a schema rollback.
    pass
